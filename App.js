import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Image, // Add this import
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { GiftedChat, Actions, InputToolbar, Bubble } from 'react-native-gifted-chat';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Latex from 'react-latex-next';
import { MathJaxSvg } from 'react-native-mathjax-html-to-svg';
// Add this function at the top of your file, outside of the App component
function logFormData(formData) {
  let result = {};
  for (let [key, value] of formData.entries()) {
    if (value instanceof File) {
      result[key] = {
        name: value.name,
        type: value.type,
        size: value.size,
      };
    } else {
      result[key] = value;
    }
  }
  return JSON.stringify(result, null, 2);
}

const Tab = createBottomTabNavigator();

function ScanScreen({ navigation }) {
  const openCamera = useCallback(async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      console.log('Image captured:', imageUri);
      navigation.navigate('Chat', { imageUri });
    }
  }, [navigation]);

  useEffect(() => {
    openCamera();
  }, [openCamera]);

  return (
    <View style={styles.container}>
      <Text>Opening camera...</Text>
    </View>
  );
}

function ChatScreen({ route }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: 'Hello! You can type a math problem or use the Scan tab to take a picture.',
        createdAt: new Date(),
        user: { _id: 2, name: 'Assistant' },
      },
    ]);
  }, []);

  useEffect(() => {
    if (route.params?.imageUri) {
      const newImageMessage = {
        _id: new Date().getTime(),
        createdAt: new Date(),
        user: { _id: 1 },
        image: route.params.imageUri,
      };
      setMessages(previousMessages => GiftedChat.append(previousMessages, [newImageMessage]));
      handleImageSolve(route.params.imageUri, newImageMessage._id);
    }
  }, [route.params?.imageUri]);

  const onSend = useCallback((newMessages = []) => {
    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
    const message = newMessages[0];
    if (message.text) {
      handleSolve(message.text, message._id);
    }
  }, []);

  const handleSolve = async (inputText, messageId) => {
    try {
      // Send text input to backend
      const response = await fetch('http://172.20.10.2:3000/api/solve-math', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: inputText }),
      });
      console.log(response);
      const data = await response.json();
      console.log(data);
      if (response.ok) {
        const solution = data.solution;
        displayAnswer(solution, messageId);
      } else {
        Alert.alert('Error', data.error || 'An error occurred.');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An error occurred while solving the problem.');
    }
  };

  const handleImageSolve = async (imageUri, messageId) => {
    try {
      // No need to update messages here, as we've already added the image message

      let base64Image;

      if (Platform.OS === 'web') {
        // For web, fetch the image and convert it to base64
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      } else {
        // For native platforms, use expo-file-system
        base64Image = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // Send image to backend
      const response = await fetch('http://172.20.10.2:3000/api/solve-math', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          filename: 'math_problem.jpg',
        }),
      });

      const data = await response.json();
      if (response.ok) {
        const solution = data.solution;
        displayAnswer(solution, messageId);
      } else {
        Alert.alert('Error', data.error || 'An error occurred.');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An error occurred while solving the problem.');
    }
  };

  const displayAnswer = (solution, messageId) => {
    const cleanedSolution = solution.replace(/###/g, '').replace(/\*\*/g, ''); // Remove "###" and "**" from the solution
    const wrappedSolution = `<latex>${cleanedSolution}</latex>`;
    const newMessage = {
      _id: messageId + 1,
      text: wrappedSolution,
      createdAt: new Date(),
      user: {
        _id: 2,
        name: 'Assistant',
      },
    };
    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessage));
  };

  const renderMessageText = (props) => {
    const textContent = props.currentMessage.text ? props.currentMessage.text.replace(/<\/?latex>/g, '') : '';
    
    if (Platform.OS === 'web') {
      return (
        <View style={styles.messageBubble(props.position)}>
          <Latex>{textContent}</Latex>
        </View>
      );
    } else {
      return (
        <View style={styles.messageBubble(props.position)}>
          <Text style={styles.messageText(props.position)}>
            <MathJaxSvg
              fontSize={16}
              color={props.position === 'left' ? '#000000' : '#FFFFFF'}
            >
              {textContent}
            </MathJaxSvg>
          </Text>
        </View>
      );
    }
  };

  const renderMessage = (props) => {
    if (props.currentMessage.image) {
      return (
        <View style={styles.messageContainer(props.position)}>
          <Image source={{ uri: props.currentMessage.image }} style={styles.imageMessage} />
        </View>
      );
    }
    return (
      <View style={styles.messageContainer(props.position)}>
        {renderMessageText(props)}
      </View>
    );
  };

  const renderBubble = (props) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: '#007AFF',
          },
          left: {
            backgroundColor: '#E5E5EA',
          },
        }}
        textStyle={{
          right: {
            color: '#FFFFFF',
          },
          left: {
            color: '#000000',
          },
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <GiftedChat
          messages={messages}
          onSend={messages => onSend(messages)}
          user={{ _id: 1 }}
          renderMessage={renderMessage}
          renderBubble={renderBubble}
          alwaysShowSend
          scrollToBottom
          textInputProps={{
            style: styles.textInput,
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text>Profile Screen</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Scan') {
                iconName = focused ? 'scan' : 'scan-outline';
              } else if (route.name === 'Chat') {
                iconName = focused ? 'chatbubble' : 'chatbubble-outline';
              } else if (route.name === 'Profile') {
                iconName = focused ? 'person' : 'person-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: {
              display: 'flex',
            },
            tabBarLabelStyle: {
              fontSize: 12,
            },
          })}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              if (e.target.toString().includes('Scan')) {
                e.preventDefault();
                navigation.navigate('Scan');
              }
            },
          })}
        >
          <Tab.Screen name="Scan" component={ScanScreen} options={{ unmountOnBlur: true }} />
          <Tab.Screen name="Chat" component={ChatScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    margin: 20,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputToolbar: {
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  messageBubble: (position) => ({
    padding: 10,
    backgroundColor: position === 'left' ? '#E5E5EA' : '#007AFF',
    borderRadius: 10,
    marginBottom: 5,
    maxWidth: '80%',
    flexShrink: 1,
  }),
  messageContainer: (position) => ({
    flexDirection: 'row',
    justifyContent: position === 'left' ? 'flex-start' : 'flex-end',
    marginVertical: 5,
    marginHorizontal: 10,
    maxWidth: '80%',
  }),
  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 6,
  },
  messageText: (position) => ({
    color: position === 'left' ? '#000000' : '#FFFFFF',
    fontSize: 16,
    flexWrap: 'wrap',
    flex: 1,
  }),
  imageMessage: {
    width: 200,
    height: 200,
    borderRadius: 13,
    margin: 3,
    resizeMode: 'cover',
  },
  // Remove inlineLatex and displayLatex styles if they're not used elsewhere
});