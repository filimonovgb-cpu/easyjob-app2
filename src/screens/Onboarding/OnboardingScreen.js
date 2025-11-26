import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import onboardingData from './onboardingData';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const [showRealApp, setShowRealApp] = useState(false);

  const handleOnDone = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setShowRealApp(true);
      navigation.replace('Welcome');
    } catch (error) {
      console.error('Ошибка при сохранении онбординга:', error);
      navigation.replace('Welcome');
    }
  };

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
      <Text style={styles.title}>{item.title}</Text>
      {item.image && (
        <Image
          source={item.image}
          style={styles.image}
          resizeMode="contain"
        />
      )}
      <Text style={styles.text}>{item.text}</Text>
    </View>
  );

  if (showRealApp) {
    return null;
  }

  return (
    <AppIntroSlider
      renderItem={renderSlide}
      data={onboardingData}
      onDone={handleOnDone}
      showSkipButton={true}
      onSkip={handleOnDone}
      nextLabel="Далее"
      doneLabel="Начать"
      skipLabel="Пропустить"
      activeDotStyle={styles.activeDot}
      dotStyle={styles.dot}
    />
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#fff',
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  image: {
    width: width * 0.7,
    height: height * 0.35,
    marginVertical: 30,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  dot: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});
