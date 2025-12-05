// src/screens/ChatScreen.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchChatMessages,
  sendMessage,
  subscribeToChat,
} from '../api/chatsAPI';

export default function ChatScreen({ route, navigation }) {
  const { chatId, chatTitle } = route.params;
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: chatTitle });

    let unsubscribe = () => {};

    const init = async () => {
      // 1. first load from API
      const history = await fetchChatMessages(chatId);
      setMessages(history);
      setLoading(false);

      // 2. realtime listener (WebSocket / Socket.IO / Firestore / Supabase — не важно)
      unsubscribe = subscribeToChat(chatId, newMessage => {
        setMessages(prev => [...prev, newMessage]);
      });
    };

    init();

    return () => unsubscribe();
  }, [chatId]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const text = input.trim();
    setInput('');

    await sendMessage(chatId, {
      text,
      senderId: user?.id,
      createdAt: Date.now(),
    });

    // scroll down
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const renderItem = ({ item }) => {
    const isMine = item.senderId === user?.id;
    return (
      <View style={[styles.messageContainer, isMine ? styles.my : styles.other]}>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.time}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.container}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
      />

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Сообщение..."
          style={styles.input}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  my: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  other: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: { color: '#000', fontSize: 15 },
  time: {
    fontSize: 10,
    color: '#555',
    marginTop: 4,
    textAlign: 'right',
  },

  inputBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 12,
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
