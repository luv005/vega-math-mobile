import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { GiftedChat, Actions, InputToolbar, Bubble } from 'react-native-gifted-chat';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// Import KaTeX for web
let katex;
if (Platform.OS === 'web') {
  katex = require('katex');
}

// Only import MathJax for native platforms
const MathJax = Platform.OS !== 'web' ? require('react-native-mathjax').default : null;

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

export default function App() {
  const [inputText, setInputText] = useState('');
  const [image, setImage] = useState(null);
  const [result, setResult] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Initialize chat with a welcome message
    setMessages([
      {
        _id: 1,
        text: 'Hello! You can type a math problem or click "Scan" to take a picture.',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Assistant',
        },
      },
    ]);
  }, []);

  const onSend = useCallback((newMessages = []) => {
    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessages));
    const message = newMessages[0];
    console.log('Received message:', message);
    if (message.text) {
      handleSolve(message.text, message._id);
    } else if (message.image || (message.image && message.image.uri)) {
      const imageUri = message.image.uri || message.image;
      console.log('Processing image:', imageUri);
      handleImageSolve(imageUri, message._id);
    } else {
      console.log('No text or image found in the message');
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
      // First, update the message to show the image
      setMessages(previousMessages => 
        previousMessages.map(msg => 
          msg._id === messageId ? { ...msg, image: imageUri } : msg
        )
      );

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
    const cleanedSolution = solution.replace(/###/g, '').replace(/\*\*/g, '');
    const newMessage = {
      _id: messageId + 1,
      text: cleanedSolution,
      createdAt: new Date(),
      user: {
        _id: 2,
        name: 'Assistant',
      },
    };
    setMessages(previousMessages => GiftedChat.append(previousMessages, newMessage));
  };

  const formatLatex = (text) => {
    // Replace newline characters with <br> tags
    text = text.replace(/\n/g, '<br>');
    
    // Wrap the entire text in <latex> tags
    return `<latex>${text}</latex>`;
  };

  const renderActions = (props) => (
    <Actions
      {...props}
      options={{
        'Scan': openCamera,
        'Cancel': () => {},
      }}
      icon={() => (
        <Text style={{ fontSize: 24, marginBottom: 5 }}>📷</Text>
      )}
      onSend={args => console.log(args)}
    />
  );

  const renderInputToolbar = (props) => (
    <InputToolbar
      {...props}
      containerStyle={styles.inputToolbar}
    />
  );

  const openCamera = async () => {
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
      const message = {
        _id: new Date().getTime(),
        createdAt: new Date(),
        user: { _id: 1 },
        image: imageUri,
      };
      console.log('Sending message with image:', message);
      onSend([message]);
    }
  };

  const renderMessageText = (props) => {
    return (
      <View style={{ 
        padding: 10,
        backgroundColor: props.position === 'left' ? '#E5E5EA' : '#007AFF',
        borderRadius: 10,
        marginBottom: 5,
      }}>
        <Latex>{props.currentMessage.text}</Latex>
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
    <SafeAreaProvider>
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
            renderActions={renderActions}
            renderInputToolbar={renderInputToolbar}
            renderMessageText={renderMessageText}
            renderBubble={renderBubble}
            alwaysShowSend
            scrollToBottom
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
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
  // ... (keep other existing styles)
});