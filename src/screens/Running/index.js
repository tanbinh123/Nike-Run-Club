/**
 * This screen is shown when you start a run
 *
 *
 * 1. Invoke watchposition api to get current location every 30 seconds
 * 2. When blurred, clear watchposition api
 * 3. Calculate kilometer traveled, time spent and pace
 * 4. Calculate calories
 * 5. Calculate progress
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View, Text, Alert} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {useNavigation} from '@react-navigation/native';
import {Avatar} from 'react-native-elements';

import ProgressBar from '../../components/ProgressBar';
import styles from './styles';
import {hasPermission} from '../../Hooks/LocationPermission';
import {
  calDistance,
  secondsToHm,
  calculatePace,
  pacePresentation,
} from '../../../constants/CalculationsPage';

const RunningScreen = ({route}) => {
  const watchId = useRef(null);
  const navigation = useNavigation();
  const props = route.params;

  // States to maintain dynamic values
  const [TotalTimeValue, setTotalTimeValue] = useState('00:00');
  const [TotalKilometersValue, setTotalKilometersValue] = useState('0.0');

  const [metric, setMetric] = useState('Kilometers');
  const [metricValue, setMetricValue] = useState('0.0');
  // Progress %
  const [progress, setProgress] = useState('0%');
  const [pace, setPace] = useState('-\'--"');
  const [calories, setCalories] = useState('--');
  // Target value set by the user
  const [targetValue, setTargetValue] = useState('0');
  // This state keeps check whether the screen is in focus or not
  const [inFocus, setInFocus] = useState(true);

  // Function to get latest location updates every 30 seconds
  const getLocationUpdates = async () => {
    const LocationPermission = await hasPermission();
    console.log(LocationPermission);
    if (!LocationPermission) {
      return;
    }
    let oldLocation = null;

    let totalTime = 0;
    let totalDistance = 0.0;
    let totalPace = 0;
    watchId.current = Geolocation.watchPosition(
      position => {
        console.log(position);
        let newDistance;
        let newTime;
        if (oldLocation == null) {
          newDistance = '0.0';
          newTime = 0;
        } else {
          newDistance = calDistance(
            oldLocation.coords.latitude,
            oldLocation.coords.longitude,
            position.coords.latitude,
            position.coords.longitude,
          );
          newTime = 30;
        }
        console.log(newDistance);
        totalDistance = totalDistance + parseFloat(newDistance);
        totalTime = totalTime + newTime;
        totalPace = totalPace + calculatePace(totalDistance, totalTime);
        console.log(totalPace);
        setTotalTimeValue(secondsToHm(totalTime).substring(0, 5));
        setTotalKilometersValue(totalDistance.toFixed(1));
        setPace(pacePresentation(totalPace));
        if (props.metric == 'Time') {
          setMetricValue(secondsToHm(totalTime).substring(0, 5));
        } else {
          setMetricValue(totalDistance.toFixed(1));
        }

        oldLocation = position;
      },
      error => {
        // setLocation(null);
        console.log(error);
      },
      {
        accuracy: {
          android: 'high',
        },
        enableHighAccuracy: true,
        distanceFilter: 0,
        interval: 30000,
        fastestInterval: 2000,
        forceRequestLocation: true,
        forceLocationManager: true,
      },
    );
  };

  // Function to remove location updates api
  const removeLocationUpdates = () => {
    if (watchId.current !== null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  // This useeffect runs only once
  useEffect(() => {
    if (props.metric == 'Time') {
      setMetric('Hours:Minutes');
      setMetricValue('00:00');
    }
    setTargetValue(props.value);
  }, []);

  const backButtonCallback = useCallback(
    event => {
      // prevent default behavior
      event.preventDefault();

      // Alert to confirm his action
      Alert.alert(
        'Discarding Run',
        'Are you sure you want to discard this run?',
        [
          {text: 'No', style: 'cancel', onPress: () => {}},
          {
            text: 'Yes',
            style: 'destructive',
            onPress: () => navigation.dispatch(event.data.action),
          },
        ],
      );
    },
    [navigation],
  );

  // UseEffect runs only when the navigation back button is pressed
  useEffect(() => {
    if (inFocus) navigation.addListener('beforeRemove', backButtonCallback);
    return () => navigation.removeListener('beforeRemove', backButtonCallback);
  }, [navigation, inFocus]);

  // This useEffect add listener to focus event
  useEffect(
    () =>
      navigation.addListener('focus', event => {
        setInFocus(true);
        getLocationUpdates();
      }),
    [navigation],
  );
  // This useEffect add listener to blur event
  useEffect(
    () =>
      navigation.addListener('blur', event => {
        setInFocus(false);
        removeLocationUpdates();
      }),
    [navigation],
  );

  return (
    <View style={styles.mainContainer}>
      <View style={styles.paceCalContainer}>
        {/* Pace */}
        <View style={styles.metricContainer}>
          <Text style={styles.metricValue}>{pace}</Text>
          <Text style={styles.metric}>Pace</Text>
        </View>
        {/* Calories */}
        <View style={styles.metricContainer}>
          <Text style={styles.metricValue}>{calories}</Text>
          <Text style={styles.metric}>Calories</Text>
        </View>
      </View>

      {/* Distance/Time metric set up */}
      <View style={styles.innerContainers}>
        <Text style={styles.mainMetric}>{metricValue}</Text>
        <Text style={styles.metric}>{metric}</Text>
      </View>
      {/* Progress bar */}
      <View style={styles.innerContainers}>
        <ProgressBar prog={progress} containerBgr={'#ccc'} />
      </View>
      {/* Pause Button */}
      <View style={styles.innerContainers}>
        <Avatar
          size={100}
          rounded
          icon={{name: 'pause'}}
          onPress={() =>
            navigation.navigate('Pause', {
              time: TotalTimeValue,
              kilometers: TotalKilometersValue,
              calories: calories,
              pace: pace,
              progressPercentage: progress,
            })
          }
          activeOpacity={0.7}
          titleStyle={styles.avatarTitle}
          containerStyle={{backgroundColor: '#000'}}
        />
      </View>
    </View>
  );
};

export default RunningScreen;
