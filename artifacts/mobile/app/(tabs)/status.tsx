import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  getGetSystemStatusQueryKey,
  useGetSystemStatus,
} from '@workspace/api-client-react';

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function GaugeBar({ value, color }: { value: number; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.gaugeTrack, { backgroundColor: colors.muted }]}>
      <View
        style={[
          styles.gaugeFill,
          { width: `${Math.min(value, 100)}%` as any, backgroundColor: color },
        ]}
      />
    </View>
  );
}

function StatusDot({ status }: { status: 'online' | 'offline' | 'degraded' }) {
  const colors = useColors();
  const dotColor =
    status === 'online' ? colors.success : status === 'degraded' ? colors.warning : colors.error;
  return <View style={[styles.dot, { backgroundColor: dotColor }]} />;
}

export default function StatusScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const { data: status, isLoading } = useGetSystemStatus({
    query: {
      queryKey: getGetSystemStatusQueryKey(),
      refetchInterval: 5000,
    },
  });

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const uptimeSecs = status ? status.uptime + tick : 0;

  const s = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: isWeb ? 67 : insets.top,
      paddingBottom: isWeb ? 34 + 50 : insets.bottom,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontFamily: 'JetBrainsMono_700Bold',
      fontSize: 14,
      color: colors.primary,
      letterSpacing: 2,
    },
    headerSub: {
      fontFamily: 'JetBrainsMono_400Regular',
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    section: {
      marginTop: 16,
      paddingHorizontal: 16,
    },
    sectionLabel: {
      fontFamily: 'JetBrainsMono_700Bold',
      fontSize: 10,
      color: colors.accent,
      letterSpacing: 2,
      marginBottom: 10,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      padding: 14,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    metricLabel: {
      fontFamily: 'JetBrainsMono_400Regular',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    metricValue: {
      fontFamily: 'JetBrainsMono_700Bold',
      fontSize: 14,
      color: colors.primary,
    },
    uptimeCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      padding: 14,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    uptimeLabel: {
      fontFamily: 'JetBrainsMono_400Regular',
      fontSize: 12,
      color: colors.mutedForeground,
    },
    uptimeValue: {
      fontFamily: 'JetBrainsMono_700Bold',
      fontSize: 18,
      color: colors.primary,
    },
    moduleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    moduleName: {
      fontFamily: 'JetBrainsMono_400Regular',
      fontSize: 12,
      color: colors.foreground,
      flex: 1,
    },
    moduleLatency: {
      fontFamily: 'JetBrainsMono_400Regular',
      fontSize: 11,
      color: colors.mutedForeground,
      marginRight: 10,
    },
    loadingText: {
      fontFamily: 'JetBrainsMono_400Regular',
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: 40,
    },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>DEDSEC//СТАТУС СИСТЕМЫ</Text>
        <Text style={s.headerSub}>
          {status
            ? `ОБНОВЛЕНО: ${new Date(status.timestamp).toLocaleTimeString('ru-RU')}`
            : 'ЗАГРУЗКА...'}
        </Text>
      </View>

      {isLoading && !status ? (
        <Text style={s.loadingText}>ИНИЦИАЛИЗАЦИЯ СОЕДИНЕНИЯ...</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* CPU */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>РЕСУРСЫ</Text>
            <View style={s.card}>
              <View style={s.row}>
                <Text style={s.metricLabel}>ЦПУ</Text>
                <Text style={s.metricValue}>{status?.cpu ?? 0}%</Text>
              </View>
              <GaugeBar value={status?.cpu ?? 0} color={colors.primary} />

              <View style={[s.row, { marginTop: 14 }]}>
                <Text style={s.metricLabel}>ПАМЯТЬ</Text>
                <Text style={s.metricValue}>{status?.memory ?? 0}%</Text>
              </View>
              <GaugeBar
                value={status?.memory ?? 0}
                color={(status?.memory ?? 0) > 80 ? colors.accent : colors.primary}
              />
            </View>
          </View>

          {/* Uptime */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>АПТАЙМ</Text>
            <View style={s.uptimeCard}>
              <Text style={s.uptimeLabel}>ВРЕМЯ РАБОТЫ</Text>
              <Text style={s.uptimeValue}>{formatUptime(uptimeSecs)}</Text>
            </View>
          </View>

          {/* Modules */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>МОДУЛИ</Text>
            <View style={s.card}>
              {(status?.modules ?? []).map((mod, i) => (
                <View
                  key={mod.name}
                  style={[s.moduleRow, i === (status?.modules?.length ?? 0) - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text style={s.moduleName}>{mod.name}</Text>
                  {mod.latency !== null && (
                    <Text style={s.moduleLatency}>{mod.latency}мс</Text>
                  )}
                  <StatusDot status={mod.status} />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gaugeTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
