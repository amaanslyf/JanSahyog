import { View } from 'react-native';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';

interface IconProps {
    color?: string;
    size?: number;
    strokeWidth?: number;
}

export const IconHome = ({ color = '#2563EB', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <Polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
);

export const IconPlus = ({ color = '#2563EB', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 5v14m-7-7h14" />
    </Svg>
);

export const IconFileText = ({ color = '#2563EB', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <Polyline points="14 2 14 8 20 8" />
        <Line x1="16" y1="13" x2="8" y2="13" />
        <Line x1="16" y1="17" x2="8" y2="17" />
        <Polyline points="10 9 9 9 8 9" />
    </Svg>
);

export const IconUser = ({ color = '#2563EB', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <Circle cx="12" cy="7" r="4" />
    </Svg>
);

export const IconBell = ({ color = '#2563EB', size = 24, strokeWidth = 2, hasNotifications = false }: IconProps & { hasNotifications?: boolean }) => (
    <View style={{ position: 'relative' }}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </Svg>
        {hasNotifications && (
            <View style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#EF4444'
            }} />
        )}
    </View>
);

export const IconShield = ({ color = '#2563EB', size = 24, strokeWidth = 1.5 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
);

export const IconMail = ({ color = '#6B7280', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <Polyline points="22 6 12 13 2 6" />
    </Svg>
);

export const IconLock = ({ color = '#6B7280', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <Circle cx="12" cy="16" r="1" />
        <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
);

export const IconEye = ({ color = '#6B7280', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <Circle cx="12" cy="12" r="3" />
    </Svg>
);

export const IconEyeOff = ({ color = '#6B7280', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <Line x1="1" y1="1" x2="23" y2="23" />
    </Svg>
);

export const IconMapPin = ({ color = '#2563EB', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <Circle cx="12" cy="10" r="3" />
    </Svg>
);

export const IconRefresh = ({ color = 'white', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="23 4 23 10 17 10" />
        <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </Svg>
);

export const IconFilter = ({ color = 'white', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </Svg>
);

export const IconX = ({ color = '#6B7280', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Line x1="18" y1="6" x2="6" y2="18" />
        <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
);

export const IconCamera = ({ color = '#10B981', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <Circle cx="12" cy="13" r="3" />
    </Svg>
);

export const IconUsers = ({ color = '#8B5CF6', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <Circle cx="9" cy="7" r="4" />
        <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
);

export const IconTrendingUp = ({ color = '#F59E0B', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <Polyline points="17 6 23 6 23 12" />
    </Svg>
);

export const IconMessageSquare = ({ color = '#2563EB', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
);

export const IconActivity = ({ color = '#2563EB', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Svg>
);

export const IconAward = ({ color = '#2563EB', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="8" r="7" />
        <Polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </Svg>
);

export const IconCheckCircle = ({ color = '#10B981', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <Polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
);

export const IconAlertCircle = ({ color = '#EF4444', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="10" />
        <Line x1="12" y1="8" x2="12" y2="12" />
        <Line x1="12" y1="16" x2="12.01" y2="16" />
    </Svg>
);

export const IconClock = ({ color = '#F59E0B', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="10" />
        <Polyline points="12 6 12 12 16 14" />
    </Svg>
);

export const IconChevronRight = ({ color = '#6B7280', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="9 18 15 12 9 6" />
    </Svg>
);

export const IconChevronLeft = ({ color = '#6B7280', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="15 18 9 12 15 6" />
    </Svg>
);

export const IconChevronUp = ({ color = '#6B7280', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="18 15 12 9 6 15" />
    </Svg>
);

export const IconSearch = ({ color = '#6B7280', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="11" cy="11" r="8" />
        <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
);

export const IconPhone = ({ color = '#6B7280', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81 .7A2 2 0 0 1 22 16.92z" />
    </Svg>
);

export const IconArrowRight = ({ color = '#FFFFFF', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Line x1="5" y1="12" x2="19" y2="12" />
        <Polyline points="12 5 19 12 12 19" />
    </Svg>
);

export const IconTrophy = ({ color = 'currentColor', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 2L9 6l-4 1 2 5-2 5 4 1 3 4 3-4 4-1-2-5 2-5-4-1z" />
    </Svg>
);

export const IconImage = ({ color = '#6B7280', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <Circle cx="9" cy="9" r="2" />
        <Polyline points="21 15 16 10 5 21" />
    </Svg>
);

export const IconSend = ({ color = 'white', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Line x1="22" y1="2" x2="11" y2="13" />
        <Polyline points="22 2 15 22 11 13 2 9 22 2" />
    </Svg>
);

export const IconAlertTriangle = ({ color = '#F59E0B', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <Line x1="12" y1="9" x2="12" y2="13" />
        <Line x1="12" y1="17" x2="12.01" y2="17" />
    </Svg>
);

export const IconChevronDown = ({ color = '#6B7280', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="6 9 12 15 18 9" />
    </Svg>
);

export const IconBarChart = ({ color = '#3B82F6', size = 16, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 20V10" />
        <Path d="M18 20V4" />
        <Path d="M6 20v-6" />
    </Svg>
);

export const IconSettings = ({ color = '#6B7280', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12.22 2h-.44a2 2 0 0 0-2 2.18l.04.38a2 2 0 0 1-1.16 1.96l-.35.17a2 2 0 0 1-2.3-.27l-.27-.27a2 2 0 0 0-2.83 0l-.31.31a2 2 0 0 0 0 2.83l.27.27a2 2 0 0 1 .27 2.3l-.17.35a2 2 0 0 1-1.96 1.16l-.38.04A2 2 0 0 0 2 13.78v.44a2 2 0 0 0 2.18 2l.38-.04a2 2 0 0 1 1.96 1.16l.17.35a2 2 0 0 1-.27 2.3l-.27.27a2 2 0 0 0 0 2.83l.31.31a2 2 0 0 0 2.83 0l.27-.27a2 2 0 0 1 2.3-.27l.35.17a2 2 0 0 1 1.16 1.96l.04.38A2 2 0 0 0 13.78 22h.44a2 2 0 0 0 2-2.18l-.04-.38a2 2 0 0 1 1.16-1.96l.35-.17a2 2 0 0 1 2.3.27l.27.27a2 2 0 0 0 2.83 0l.31-.31a2 2 0 0 0 0-2.83l-.27-.27a2 2 0 0 1-.27-2.3l.17-.35a2 2 0 0 1 1.96-1.16l.38-.04A2 2 0 0 0 22 10.22v-.44a2 2 0 0 0-2.18-2l-.38.04a2 2 0 0 1-1.16-1.96l-.17-.35a2 2 0 0 1 .27-2.3l.27-.27a2 2 0 0 0 0-2.83l-.31-.31a2 2 0 0 0-2.83 0l-.27.27a2 2 0 0 1-2.3.27l-.35-.17a2 2 0 0 1-1.16-1.96L10.22 2z" />
        <Circle cx="12" cy="12" r="3" />
    </Svg>
);

export const IconLogOut = ({ color = '#EF4444', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <Polyline points="16 17 21 12 16 7" />
        <Path d="M21 12H9" />
    </Svg>
);

export const IconStar = ({ color = '#F59E0B', size = 16, filled = true }: IconProps & { filled?: boolean }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1">
        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
);

export const IconMedal = ({ color = '#F59E0B', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="8" r="6" />
        <Path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </Svg>
);

export const IconHelp = ({ color = '#6B7280', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="10" />
        <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <Path d="M12 17h.01" />
    </Svg>
);

export const IconGift = ({ color = '#6B7280', size = 20, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Polyline points="20 12 20 22 4 22 4 12" />
        <Rect x="2" y="7" width="20" height="5" />
        <Line x1="12" y1="22" x2="12" y2="7" />
        <Path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <Path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </Svg>
);

// Alternative Trophy Icon (Leaderboard specific)
export const IconTrophyAlt = ({ color = '#F59E0B', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <Path d="M4 22h16" />
        <Path d="M10 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34" />
        <Path d="M2 14a6 6 0 0 0 6-6V6h8v2a6 6 0 0 0 6 6H2Z" />
    </Svg>
);

export const IconArrowLeft = ({ color = '#1F2937', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Line x1="19" y1="12" x2="5" y2="12" />
        <Polyline points="12 19 5 12 12 5" />
    </Svg>
);

export const IconCalendar = ({ color = '#6B7280', size = 24, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <Line x1="16" y1="2" x2="16" y2="6" />
        <Line x1="8" y1="2" x2="8" y2="6" />
        <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
);

export const IconArrowUp = ({ color = '#10B981', size = 12, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Line x1="12" y1="19" x2="12" y2="5" />
        <Polyline points="5 12 12 5 19 12" />
    </Svg>
);

export const IconArrowDown = ({ color = '#EF4444', size = 12, strokeWidth = 2 }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Line x1="12" y1="5" x2="12" y2="19" />
        <Polyline points="19 12 12 19 5 12" />
    </Svg>
);
