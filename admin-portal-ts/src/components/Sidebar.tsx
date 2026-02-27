import React from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    ReportProblem as IssuesIcon,
    People as PeopleIcon,
    Business as DepartmentIcon,
    Notifications as NotificationsIcon,
    Assessment as AnalyticsIcon,
    Email as CommunicationIcon,
    Map as MapIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── Constants ───────────────────────────────────────────────────────────────

const DRAWER_WIDTH = 240;

interface MenuItem {
    text: string;
    icon: React.ReactElement;
    path: string;
}

const MENU_ITEMS: MenuItem[] = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Issues', icon: <IssuesIcon />, path: '/issues' },
    { text: 'Map View', icon: <MapIcon />, path: '/map' },
    { text: 'Departments', icon: <DepartmentIcon />, path: '/departments' },
    { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Communication', icon: <CommunicationIcon />, path: '/communication' },
    { text: 'Users', icon: <PeopleIcon />, path: '/users' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface SidebarProps {
    open: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <Drawer
            variant="persistent"
            anchor="left"
            open={open}
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                },
            }}
        >
            <Toolbar />
            <List>
                {MENU_ITEMS.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => navigate(item.path)}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Drawer>
    );
};

export default Sidebar;
