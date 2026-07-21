import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import {
  getGetSystemStatusQueryKey,
  useExecuteCommand,
  useGetSystemStatus,
} from '@workspace/api-client-react';

type LogEntry = {
  id: string;
  type: 'boot' | 'input' | 'info' | 'success' | 'error' | 'system';
  text: string;
  timestamp: string;
};

const BOOT_SEQ = [
  'DEDSEC // ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ...',
  'ОБХОД БРАНДМАУЭРА: УСПЕШНО.',
  'ЗАГРУЗКА ХАКЕРСКИХ МОДУЛЕЙ...',
  'ШИФРОВАНИЕ КАНАЛА: АКТИВНО.',
  'ДОБРО ПОЖАЛОВАТЬ, ОПЕРАТОР.',
];

function formatTime(): string {
  return new Date().toLocaleTimeString('ru-RU', { hour12: false });
}

// ⚡ Bolt Optimization: Memoize EntryRow rendering.
// Since log entries are immutable once loaded and added to the list, but a blinking cursor interval
// triggers state updates every 500ms, wrapping EntryRow in React.memo and comparing the entry ID
// completely prevents unnecessary re-renders of existing historical log items. This drastically
// cuts down render time and layout overhead of list items on every single blinking cursor tick.
const EntryRow = React.memo(function EntryRow({ entry, colors }: { entry: LogEntry; colors: ReturnType<typeof useColors> }) {
  let textColor = colors.primary;
  if (entry.type === 'error') textColor = colors.destructive;
  if (entry.type === 'system' || entry.type === 'boot') textColor = colors.accent;
  if (entry.type === 'input') textColor = colors.primary;

  return (
    <View style={[styles.entryRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.timestamp, { color: colors.mutedForeground, fontFamily: 'JetBrainsMono_400Regular' }]}>
        [{entry.timestamp}]
      </Text>
      {entry.type === 'input' ? (
        <Text style={[styles.entryText, { fontFamily: 'JetBrainsMono_400Regular' }]}>
          <Text style={{ color: colors.accent }}>{'> '}</Text>
          <Text style={{ color: colors.primary }}>{entry.text}</Text>
        </Text>
      ) : (
        <Text style={[styles.entryText, { color: textColor, fontFamily: 'JetBrainsMono_400Regular' }]}>
          {entry.text}
        </Text>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.entry.id === nextProps.entry.id && prevProps.colors === nextProps.colors;
});

export default function TerminalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [blinkOn, setBlinkOn] = useState(true);
  const bootedRef = useRef(false);

  const mutation = useExecuteCommand();

  const { data: statusData } = useGetSystemStatus({
    query: { queryKey: getGetSystemStatusQueryKey(), refetchInterval: 5000 },
  });

  // Blinking cursor
  useEffect(() => {
    const t = setInterval(() => setBlinkOn(v => !v), 500);
    return () => clearInterval(t);
  }, []);

  // Boot sequence
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    let delay = 0;
    const seed = Date.now();
    BOOT_SEQ.forEach((text, i) => {
      delay += 280 + Math.random() * 300;
      setTimeout(() => {
        setEntries(prev => [
          { id: `boot-${seed}-${i}`, type: 'boot', text, timestamp: formatTime() },
          ...prev,
        ]);
      }, delay);
    });
  }, []);

  const submit = () => {
    if (!input.trim() || mutation.isPending) return;
    const cmd = input.trim();
    setInput('');
    setHistory(prev => [...prev, cmd]);
    setHistoryIdx(-1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setEntries(prev => [
      { id: `in-${Date.now()}`, type: 'input', text: cmd, timestamp: formatTime() },
      ...prev,
    ]);

    mutation.mutate(
      { data: { command: cmd } },
      {
        onSuccess: res => {
          if (res.type === 'clear') {
            setEntries([]);
            return;
          }
          setEntries(prev => [
            {
              id: `out-${Date.now()}`,
              type: res.type as LogEntry['type'],
              text: res.output,
              timestamp: res.timestamp
                ? new Date(res.timestamp).toLocaleTimeString('ru-RU', { hour12: false })
                : formatTime(),
            },
            ...prev,
          ]);
        },
        onError: (err: unknown) => {
          const apiData = (err as { data?: { output?: string } } | null)?.data;
          const text = apiData?.output ?? 'СИСТЕМНАЯ ОШИБКА: НЕТ СВЯЗИ С ЦЕНТРОМ';
          setEntries(prev => [
            { id: `err-${Date.now()}`, type: 'error', text, timestamp: formatTime() },
            ...prev,
          ]);
        },
      },
    );
  };

  const historyBack = () => {
    if (history.length === 0) return;
    const nextIdx = historyIdx < history.length - 1 ? historyIdx + 1 : historyIdx;
    setHistoryIdx(nextIdx);
    setInput(history[history.length - 1 - nextIdx]);
  };

  const historyForward = () => {
    if (historyIdx <= 0) {
      setHistoryIdx(-1);
      setInput('');
      return;
    }
    const nextIdx = historyIdx - 1;
    setHistoryIdx(nextIdx);
    setInput(history[history.length - 1 - nextIdx]);
  };

  // Status dot helper
  const getWorstStatus = (nameFragments: string[]) => {
    if (!statusData?.modules) return 'online';
    const matched = statusData.modules.filter(m =>
      nameFragments.some(n => m.name.includes(n)),
    );
    if (matched.some(m => m.status === 'offline')) return 'offline';
    if (matched.some(m => m.status === 'degraded')) return 'degraded';
    return 'online';
  };

  const dotColor = (s: string) =>
    s === 'online' ? colors.success : s === 'degraded' ? colors.warning : colors.error;

  const sysStatus = getWorstStatus(['ШИФРАТОР', 'ЖУРНАЛ']);
  const netStatus = getWorstStatus(['СЕТЕВОЙ']);
  const intStatus = getWorstStatus(['ПЕРЕХВАТЧИК', 'АНАЛИЗАТОР']);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={0}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: isWeb ? 67 : insets.top,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.primary }]}>
          {'DEDSEC//TERMINAL'}
          <Text style={{ color: colors.accent, opacity: blinkOn ? 1 : 0 }}>▌</Text>
        </Text>
        <View style={styles.statusDots}>
          {[
            { label: 'СИС', status: sysStatus },
            { label: 'СЕТЬ', status: netStatus },
            { label: 'ПЕР', status: intStatus },
          ].map(({ label, status }) => (
            <View key={label} style={styles.dotRow}>
              <Text style={[styles.dotLabel, { color: colors.mutedForeground }]}>{label}</Text>
              <View style={[styles.dot, { backgroundColor: dotColor(status) }]} />
            </View>
          ))}
        </View>
      </View>

      {/* Log */}
      <FlatList
        data={entries}
        inverted
        keyExtractor={item => item.id}
        renderItem={({ item }) => <EntryRow entry={item} colors={colors} />}
        style={styles.log}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            ОЖИДАНИЕ КОМАНДЫ...
          </Text>
        }
      />

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: isWeb ? 34 : insets.bottom + 8,
          },
        ]}
      >
        <Text style={[styles.prompt, { color: colors.accent }]}>DS $</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={submit}
          returnKeyType="send"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          placeholderTextColor={colors.mutedForeground}
          placeholder="директива..."
          style={[
            styles.textInput,
            {
              color: colors.primary,
              fontFamily: 'JetBrainsMono_400Regular',
              borderBottomColor: colors.border,
            },
          ]}
        />
        {/* History nav */}
        <Pressable onPress={historyBack} style={styles.histBtn}>
          <Ionicons name="chevron-up" size={16} color={colors.mutedForeground} />
        </Pressable>
        <Pressable onPress={historyForward} style={styles.histBtn}>
          <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
        </Pressable>
        {/* Send */}
        <Pressable
          onPress={submit}
          disabled={mutation.isPending || !input.trim()}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor:
                mutation.isPending || !input.trim()
                  ? colors.muted
                  : colors.primary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons
            name="arrow-forward"
            size={16}
            color={
              mutation.isPending || !input.trim()
                ? colors.mutedForeground
                : colors.primaryForeground
            }
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 15,
    letterSpacing: 1,
  },
  statusDots: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 2,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dotLabel: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    letterSpacing: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  log: {
    flex: 1,
  },
  entryRow: {
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.55,
  },
  entryText: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 40,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 6,
    borderTopWidth: 1,
  },
  prompt: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  histBtn: {
    padding: 4,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
