import React, { useState, useEffect }from 'react'
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView, Image, Modal } from 'react-native';
import { StepCard } from '../components/Cards';
import { screenWidth, screenHeight } from '../components/Dimensions';
import { RFPercentage } from 'react-native-responsive-fontsize';
import { Stopwatch, Timer } from 'react-native-stopwatch-timer';
import FlipCard from 'react-native-flip-card';

import music from '../../assets/images/music.png';
import text from '../../assets/images/text.png';
import stop from '../../assets/images/stop.png';
import videoImg from '../../assets/images/video.png';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

import { styles } from '../../assets/css/Style';
import { getGuide } from '../Data/Practices/GuideDB';
import { getReligionByPractice, timeDB, timeDB2, timeDB3 } from '../Data/LocalDB';
import { getTimeModel, getTimeModel2 } from '../models/TimeModel';
import { StackActions } from '@react-navigation/native';
import Bible from './Extensions/Bible';
import VideoPlayer from './Extensions/Video';

export default function Session({ navigation, route }) {
    const data = route.params

    const practiceTitle = data.title
    const bia = data?.bia
    const imgGuide = data.img

    const religion = getReligionByPractice(practiceTitle)

    // Modals for Summary and BGM Selection
    const [bgmVisible, setBgmVisible] = useState(false);

    // Set Value for guide content and time
    const [ guide, setGuide ] = useState();
    const [ time, setTime ] = useState(Number);
    const [timerRunning, setTimerRunning] = useState(true);
    const [stopwatchTime, setStopwatchTime] = useState([])

    // Use State for Text-To-Speech
    const [isSpeaking, setIsSpeaking] = useState(true);

    // Video component
    const video = React.useRef(null);
    const [status, setStatus] = React.useState({});

    // Use States for flippable components
    const [guideFlipped, setGuideFlipped] = useState(false);
    const [textFlipped, setTextFlipped] = useState(false);

    // Use States for sounds and selected sounds
    const [sounds, setSounds] = useState([]);
    const [clickedIndexes, setClickedIndexes] = useState([]);

    const toggleItem = (index) => {
        if (clickedIndexes.includes(index)) {
            setClickedIndexes(clickedIndexes.filter((clickedIndex) => clickedIndex !== index));
        } else {
            setClickedIndexes([...clickedIndexes, index]);
        }
    };

    const soundFiles = [
        require('./../../assets/sounds/campfire.wav'),
        require('./../../assets/sounds/night.wav'),
        require('./../../assets/sounds/rain.wav'),
        require('./../../assets/sounds/waves.wav')
    ];

    const soundFilesName = [
        'Campfire',
        'Night',
        'Rain',
        'Waves'
    ];

    useEffect(() => {
        const loadSounds = async () => {
            try {
                const loadedSounds = await Promise.all(
                    soundFiles.map(async (soundFile) => {
                        const { sound } = await Audio.Sound.createAsync(soundFile);
                        return sound;
                    })
                );
                setSounds(loadedSounds);
            } catch (error) {
                console.error('Error loading sounds:', error);
            }
        };
        loadSounds();
    }, []);

    const playSound = async (index) => {
        try {
            const sound = sounds[index];
            await sound.replayAsync();
            
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                  // Sound finished playing, replay it
                  playSound(index);
                }
            });

            toggleItem(index);
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    };

    const stopSound = async (index) => {
        try {
            const sound = sounds[index];
            await sound.stopAsync();
            setClickedIndexes(clickedIndexes.filter((clickedIndex) => clickedIndex !== index));
        } catch (error) {
            console.error('Error stopping sound:', error);
        }
    };

    const stopAllSounds = async () => {
        try {
            await Promise.all(sounds.map((sound) => sound.stopAsync()));
            setSounds([]);
            setClickedIndexes([]);
        } catch (error) {
            console.error('Error stopping all sounds:', error);
        }
    };

    useEffect(() => {
        return () => {
            stopAllSounds();
        };
    }, []);

    const handlePlaySound = (index) => {
        playSound(index);
    };

    const handleStopSound = (index) => {
        stopSound(index);
    };
    
    useEffect(() => {
        const fetchGuide = () => {
            if (!timerRunning) {
                // Timer finished, stop the useEffect
                return;
            }
            setGuide(getGuide(practiceTitle, religion))
            // evaluate if practice 
            const inTimeDB = Object.keys(timeDB).includes(practiceTitle);
            const inTimeDB2 = Object.keys(timeDB2).includes(practiceTitle);
            const inTimeDB3 = Object.keys(timeDB3).includes(practiceTitle);
            if (inTimeDB) {
                // console.log('active: timeDB')
                setTime(getTimeModel(practiceTitle))
            } else if (inTimeDB2) {
                // console.log('active: timeDB2')
                setTime(getTimeModel2(practiceTitle,bia))
            } else if (inTimeDB3) {
                // console.log('active: timeDB3')
                setTime(0)
            }
        };
        fetchGuide();
    }, [guide, practiceTitle, religion])

    const showGuide = () => {
        const steps = [];
        let stepCount = 1
        let count = ''
        for (const property in guide){
            count = ('Step ' + stepCount)
            steps.push(
                <StepCard count={count} desc={property} detailedDesc={guide[property]}></StepCard>
            );
            stepCount++
        }
        return steps;
    }

    const callStopwatch = () => {
        const clock = [];
        clock.push(
            <Stopwatch
                start={timerRunning}
                startTime={time}
                options= {{
                    container: inStyles.duration,
                    text: inStyles.durationText,
                }}
                getTime={(time) => {
                    setStopwatchTime(time)
                }}
            />
        )
        return clock
    }

    const callTimer = () => {
        const clock = [];
        // console.log('time: ',time)
        clock.push(
            <>
                <Timer
                    start={timerRunning}
                    totalDuration={time}
                    options={{
                        container: inStyles.duration,
                        text: inStyles.durationText,
                    }}
                />
                <Stopwatch
                    start={timerRunning}
                    startTime={0}
                    options= {{
                        container: { display: 'none' },
                        text: { display: 'none' },
                    }}
                    getTime={(time) => {
                        setStopwatchTime(time)
                    }}
                />
            </>
        )
        return clock
    }

    useEffect(() => {
        if (!isSpeaking) {
            flipText();
        }
    }, [isSpeaking]);

    const speak = () => {
        flipText();
        let thingToSay = []
        for (const property in guide){
            thingToSay.push(guide[property])
        }
        const options = {
            voice: 'Microsoft Zira - English (United States)',
            rate: 0.9,
            onStart: () => setIsSpeaking(true),
            onDone: () => setIsSpeaking(false),
        }
        Speech.speak(thingToSay, options);
    };

    const stopSpeech = () => {
        Speech.stop();
        flipText();
    };

    const flipGuide = () => {
        setGuideFlipped(!guideFlipped);
    };

    const flipText = () => {
        setTextFlipped(!textFlipped);
    };

    const concludeSession = (practiceTitle, stopwatchTime ) => {
        stopAllSounds();
        setTimerRunning(false);
        Speech.stop();
        const data = {
            practiceTitle: practiceTitle,
            stopwatchTime: stopwatchTime
            // meditation type
            // times practiced
        };
        navigation.dispatch(StackActions.popToTop());
        navigation.navigate('ConcludeSession', {data});
    };

    const showBgmModal = () => {
        setBgmVisible(true);
    };
    
    const hideBgmModal = () => {
        setBgmVisible(false);
    };

    return (
        <SafeAreaView style={[styles.screen, styles.bgColorPrimary]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <View style={[inStyles.imageContainer, styles.dropShadow]}>
                        <Image style={[{ width: '100%', height: '100%' }]} source={imgGuide}></Image>
                    
                        <View style={inStyles.headerContainer}>
                            <View style={{ gap: 5 }}>
                                <Text style={[styles.bold, styles.colorWhite, { fontSize: RFPercentage(2) }]}>{practiceTitle}</Text>
                                <View style={inStyles.timerContainer}>
                                    {time === 0 ? callStopwatch() : callTimer()}
                                </View>
                            </View>
                            
                            <View style={inStyles.optionsContainer}>
                                <TouchableOpacity style={[styles.dropShadow, inStyles.btnMedia]} onPress={showBgmModal}>
                                    <Image style={[{ width: 40, height: 40 }]} source={music}/>
                                </TouchableOpacity>

                                <FlipCard
                                    flipHorizontal={true}
                                    flipVertical={false}
                                    flip={textFlipped}
                                    clickable={false}>
                                    <TouchableOpacity style={[styles.dropShadow, inStyles.btnMedia]} onPress={speak}>
                                        <Image style={[{ width: 40, height: 40 }]} source={text}/>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.dropShadow, inStyles.btnMedia]} onPress={stopSpeech}>
                                    <Image style={[{ width: 40, height: 40 }]} source={stop}/>
                                    </TouchableOpacity>
                                </FlipCard>

                                <TouchableOpacity style={[styles.dropShadow, inStyles.btnMedia]} onPress={flipGuide}>
                                    <Image style={[{ width: 40, height: 40 }]} source={videoImg}/>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>        
                    <View style={inStyles.guideContainer}>
                        <FlipCard
                            friction={6}
                            perspective={1000}
                            flipHorizontal={true}
                            flipVertical={false}
                            flip={guideFlipped}
                            clickable={false}>
                                
                            {/* front */}
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {showGuide()}
                            </ScrollView>

                            {/* back */}
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Bible/>
                                {/* <VideoPlayer/> */}
                            </ScrollView>
                        </FlipCard>
                    </View>

                    <View style={inStyles.bottomContainer}>      
                        <TouchableOpacity style={[styles.dropShadow, styles.bgColorPrimary, inStyles.btnEnd]} onPress={() => {concludeSession(practiceTitle, stopwatchTime)}}>
                            <Text style={[{ fontSize: RFPercentage(3) }, styles.colorWhite, styles.bold]}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <Modal visible={bgmVisible} animationType='slide' transparent={true}>
                        <View style={inStyles.bgmContainer}>
                            <View style={[inStyles.bgmContent, { gap: 15 }]}>
                                <Text style={[styles.bold, { fontSize: RFPercentage(2) }]}>Background Music</Text>
                                <ScrollView style={inStyles.bgmListContainer} showsVerticalScrollIndicator={false}>
                                    {sounds.map((sound, index) => (
                                        <View key={index}>
                                            <TouchableOpacity onPress={() => {
                                                if (clickedIndexes.includes(index)) {handleStopSound(index);}
                                                else {handlePlaySound(index);}}}>
                                                <Text style={[inStyles.itemText, styles.bold, clickedIndexes.includes(index) && inStyles.selectedItemText]}>
                                                    {soundFilesName[index]}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity onPress={hideBgmModal}>
                                    <Text style={[styles.bold, { fontSize: RFPercentage(2) }]}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const inStyles = StyleSheet.create({
    imageContainer: {
        width: screenWidth('100%'),
        height: screenHeight('40%'),
        zIndex: 1,
    },

    headerContainer: {
        width: screenWidth('100%'),
        height: screenHeight('10%'),
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'absolute',
    },

    optionsContainer: {
        flexDirection: 'row',
        gap: 15,
    },

    guideContainer: {
        width: screenWidth('90%'),
        height: screenHeight('50%'),
        alignItems: 'center',
    },

    bottomContainer: {
        width: screenWidth('100%'),
        height: screenHeight('10%'),
        alignItems: 'center',
        paddingVertical: 15,
        backgroundColor: '#FFFFFF',
        shadowColor: 'rgba(35, 35, 35, 0.5)',
        shadowOpacity: 3,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: -3 },
    },

    timerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: screenWidth('25%'),
        height: screenHeight('3%'),
        borderRadius: 20,
        borderColor: '#2EC4B6',
        borderWidth: 2,
        backgroundColor: '#FFFFFF',
    },

    btnMedia: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#2EC4B6',
        backgroundColor: '#FFFFFF',
    },

    btnEnd: {
        justifyContent: 'center',
        alignItems: 'center',
        width: screenWidth('90%'),
        height: '100%',
        borderRadius: 30,
        padding: 15,
    },

    duration: {
        padding: 15,
        width: screenWidth('24%'),
    },

    durationText: {
        color: '#2EC4B6',
        fontSize: RFPercentage(1.5),
        fontWeight: 'bold',
        textAlign: 'center',
    },
    
    bgmContainer: {
        textAlign: 'center',
        justifyContent: 'flex-end',
        alignItems: 'center',
        flex: 1,
    },

    bgmContent: {
        bottom: 0,
        width: screenWidth('100%'),
        height: screenHeight('40%'),
        padding: 15,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: -3,
        },
        shadowOpacity: 0.5,
        shadowRadius: 3,
    },

    bgmListContainer: {
        width: screenWidth('90%'),
        height: screenHeight('15%'),
        padding: 15,
        borderWidth: 2,
        borderRadius: 20,
        borderColor: '#2EC4B6',
    },

    itemText: {
        fontSize: RFPercentage(2),
        paddingVertical: 5,
        margin: 5,
        flex: 1,
    },
    
    selectedItemText: {
        color: '#FFFFFF',
        backgroundColor: '#FFBF69',
        borderRadius: 20,
    },
});