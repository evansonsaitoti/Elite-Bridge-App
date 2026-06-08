import { ScrollView, Text, View, TouchableOpacity, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useCallback, useState } from 'react';

interface Shift {
  id: number;
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  description: string;
  backgroundCheckRequired: boolean;
  applicants: number;
}

export default function ShiftsHomeScreen() {
  const colors = useColors();
  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: 1,
      title: 'Home Care Assistant - Dracut',
      location: 'Dracut, MA',
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 86400000 + 28800000).toISOString(),
      hourlyRate: 18.5,
      description: 'Provide personal care assistance and companionship',
      backgroundCheckRequired: true,
      applicants: 3,
    },
    {
      id: 2,
      title: 'Companion Care - Lowell',
      location: 'Lowell, MA',
      startTime: new Date(Date.now() + 172800000).toISOString(),
      endTime: new Date(Date.now() + 172800000 + 28800000).toISOString(),
      hourlyRate: 16.0,
      description: 'Provide companionship and household support',
      backgroundCheckRequired: true,
      applicants: 1,
    },
    {
      id: 3,
      title: 'Household Support - Chelmsford',
      location: 'Chelmsford, MA',
      startTime: new Date(Date.now() + 259200000).toISOString(),
      endTime: new Date(Date.now() + 259200000 + 21600000).toISOString(),
      hourlyRate: 15.0,
      description: 'Assist with household tasks and errands',
      backgroundCheckRequired: false,
      applicants: 0,
    },
  ]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderShiftCard = ({ item }: { item: Shift }) => (
    <TouchableOpacity
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, marginBottom: 4 }}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted }}>
          📍 {item.location}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, color: colors.muted }}>
          📅 {formatDate(item.startTime)}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
          ${item.hourlyRate.toFixed(2)}/hr
        </Text>
      </View>

      <Text style={{ fontSize: 13, color: colors.muted, marginBottom: 12, lineHeight: 18 }}>
        {item.description}
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {item.backgroundCheckRequired && (
            <View
              style={{
                backgroundColor: colors.warning,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 11, color: '#fff', fontWeight: '500' }}>
                Background Check
              </Text>
            </View>
          )}
          {item.applicants > 0 && (
            <View
              style={{
                backgroundColor: colors.muted,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 11, color: '#fff', fontWeight: '500' }}>
                {item.applicants} applied
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
            Apply
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="bg-background">
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground, marginBottom: 4 }}>
            Available Shifts
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>
            Find and apply for shifts in Massachusetts
          </Text>
        </View>

        {/* Search and Filter */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
          <TouchableOpacity
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.muted, flex: 1 }}>
              🔍 Search shifts...
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                flex: 1,
              }}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '500', fontSize: 13 }}>
                📍 Location
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.surface,
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                flex: 1,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.foreground, textAlign: 'center', fontWeight: '500', fontSize: 13 }}>
                💰 Rate
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shifts List */}
        <FlatList
          data={shifts}
          renderItem={renderShiftCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}
          scrollEnabled={true}
        />
      </View>
    </ScreenContainer>
  );
}
