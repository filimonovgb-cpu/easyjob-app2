import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { chatsAPI } from '../services/api';
import { COLORS } from '../constants/colors';

export default function ChatListScreen() {
  const navigation = useNavigation();
  const { user, role } = useAuth();

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // -------- Загрузка списка чатов -------
  const loadChats = async () => {
    try {
      const data = await chatsAPI.getMyChats(user.id);
      setChats(data || []);
    } catch (err) {
      console.log('ChatList load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Pull to refresh ----------
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, []);

  // ---------- Авто-обновление при возврате на экран ----------
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadChats();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    loadChats();
  }, []);

  // Определение собеседника
  const getCompanion = (chat) => {
    return role === 'client' ? chat.contractor : chat.client;
  };

  // ----------- UI ----------------

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (chats.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#777', fontSize: 16 }}>Пока нет чатов</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const companion = getCompanion(item);

          return (
            <TouchableOpacity
              style={styles.chatCard}
              onPress={() =>
                navigation.navigate('Chat', {
                  chatId: item.id,
                  companionId: companion.id,
                })
              }
            >
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>
                  {companion.firstName?.[0] || '?'}
                </Text>
              </View>

              <View style={styles.info}>
                <Text style={styles.name}>
                  {companion.firstName} {companion.lastName}
                </Text>

                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage || 'Нет сообщений'}
                </Text>
              </View>

              <View style={styles.meta}>
                <Text style={styles.time}>
                  {item.lastMessageTime
                    ? new Date(item.lastMessageTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </Text>

                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatCard: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  info: { flex: 1 },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  lastMessage: {
    color: '#666',
    fontSize: 13,
  },
  meta: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 40,
  },
  time: {
    color: '#999',
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
