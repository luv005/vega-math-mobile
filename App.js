import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

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

  const handleUpload = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access media library is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      base64: true,
    });

    if (!pickerResult.canceled) {
      setImage(pickerResult.assets[0]);
      console.log('Image set:', pickerResult.assets[0].uri);
    }
  };

  const handleSolve = async () => {
    try {
      let body;
      let headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

      if (image) {
        // Use FileReader API for web compatibility
        const response = await fetch(image.uri);
        const blob = await response.blob();
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        body = JSON.stringify({
          image: base64.split(',')[1], // Remove the data URL prefix
          fileName: image.uri.split('/').pop(),
          fileType: image.type || 'image/jpeg',
        });
        console.log('Image file name:', image.uri.split('/').pop());
        console.log('Image file type:', image.type || 'image/jpeg');
      } else if (inputText) {
        body = JSON.stringify({ input: inputText });
      } else {
        Alert.alert('Input Required', 'Please enter a math problem or upload an image.');
        return;
      }

      console.log('Request Headers:', headers);

      const response = await fetch('http://localhost:3000/api/solve-math', {
        method: 'POST',
        headers: headers,
        body: body,
      });

      const responseText = await response.text();
      console.log('Response Text:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      const cleanedSolution = data.solution.replace(/###/g, '').replace(/\*\*/g, ''); // Remove "###" and "**" from the solution
      setResult(cleanedSolution);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An error occurred while solving the problem.');
    }
  };

  const formatSolution = (solution) => {
    // Split the solution into steps
    const steps = solution.split('\n\n').filter(step => step.trim() !== '');
    
    // Format each step
    const formattedSteps = steps.map((step, index) => {
      // Check if the step already starts with "Step X:"
      if (step.startsWith('Step')) {
        return step;
      }
      // If not, add the step number
      return `Step ${index + 1}: ${step.trim()}`;
    });
    
    // Join the formatted steps
    return formattedSteps.join('\n\n');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Math Problem Solver</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter a math problem"
        onChangeText={setInputText}
        value={inputText}
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleUpload}>
          <Text style={styles.buttonText}>Upload</Text>
        </TouchableOpacity>
      </View>

      {image && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: image.uri }} style={styles.image} />
          <Text>Image URI: {image.uri}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleSolve}>
          <Text style={styles.buttonText}>Solve</Text>
        </TouchableOpacity>
      </View>

      {result !== '' && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Result:</Text>
          <Latex>{result}</Latex>
        </View>
      )}
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5FCFF',
    justifyContent: 'flex-start', // Changed from 'center' to 'flex-start'
    paddingTop: 50, // Added to give some space at the top
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderColor: '#CCC',
    borderWidth: 1,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderRadius: 8,
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#1976D2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 18,
  },
  imageContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
});