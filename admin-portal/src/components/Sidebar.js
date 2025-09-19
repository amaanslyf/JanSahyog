// src/components/Sidebar.js - ADD MAP PAGE
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
  Map as MapIcon, // NEW
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Issues', icon: <IssuesIcon />, path: '/issues' },
  { text: 'Map View', icon: <MapIcon />, path: '/map' }, // NEW
  { text: 'Departments', icon: <DepartmentIcon />, path: '/departments' },
  { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
  { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
  { text: 'Communication', icon: <CommunicationIcon />, path: '/communication' },
  { text: 'Users', icon: <PeopleIcon />, path: '/users' },
];

const Sidebar = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar />
      <List>
        {menuItems.map((item) => (
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
