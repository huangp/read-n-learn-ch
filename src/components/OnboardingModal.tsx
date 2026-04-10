import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Text, Button, Icon } from 'react-native-paper';
import { Portal, Modal } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Import Articles',
    description:
      'Add articles from cloud sync (requires subscription) or import your own. Organise your articles with tags. See vocabulary stats on each article (number of characters are known/unknown etc). Build your personal Chinese reading library.',
    icon: 'cloud-download',
  },
  {
    id: '2',
    title: 'Lookup Vocabulary',
    description:
      'Tap any Chinese word to instantly see definitions, pinyin, examples. You can toggle between offline dictionary (free but may have limited coverage) or cloud lookup (requires subscription)',
    icon: 'text-search',
  },
  {
    id: '3',
    title: 'Character Browser',
    description:
      'Track which characters you know and which need practice. Build your vocabulary over time.',
    icon: 'translate',
  },
  {
    id: '4',
    title: 'Track Progress',
    description:
      'Monitor your reading stats and HSK level coverage. Reinforce the learning of the characters you struggled with the most. See how much you have improved over time!',
    icon: 'chart-line',
  },
];

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <View style={styles.iconContainer}>
        <Icon source={item.icon} size={80} color="#5856D6" />
      </View>
      <Text variant="headlineMedium" style={styles.title}>
        {item.title}
      </Text>
      <Text variant="bodyLarge" style={styles.description}>
        {item.description}
      </Text>
    </View>
  );

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(slideIndex);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <Portal>
      <Modal
        visible={visible}
        dismissable={false}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.container}>
          <FlatList
            ref={flatListRef}
            data={SLIDES}
            renderItem={renderSlide}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            bounces={false}
          />

          {/* Pagination dots */}
          <View style={styles.pagination}>
            {SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {/* Button area */}
          <View style={styles.buttonContainer}>
            {isLastSlide ? (
              <Button
                mode="contained"
                onPress={onComplete}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Get Started
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleNext}
                style={styles.button}
                contentStyle={styles.buttonContent}
              >
                Next
              </Button>
            )}
          </View>

          {/* Page counter */}
          <Text variant="bodySmall" style={styles.pageCounter}>
            {currentIndex + 1} / {SLIDES.length}
          </Text>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    width,
    height,
    margin: 0,
    padding: 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 120,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F0EFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
    color: '#333',
  },
  description: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 26,
    paddingHorizontal: 10,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#5856D6',
    width: 24,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    height: 50,
  },
  pageCounter: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    color: '#999',
  },
});
