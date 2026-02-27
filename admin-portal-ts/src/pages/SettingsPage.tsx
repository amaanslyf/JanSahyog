import React, { useState } from 'react';
import {
    Box, Typography, Card, CardContent, TextField, Button, Alert, Stack,
    Chip,
} from '@mui/material';
import { Key as KeyIcon } from '@mui/icons-material';
import { setGeminiApiKey, getGeminiApiKey, hasGeminiApiKey } from '../services/aiAnalysisService';

const SettingsPage: React.FC = () => {
    const [apiKey, setApiKey] = useState(getGeminiApiKey() ?? '');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setGeminiApiKey(apiKey.trim());
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleClear = () => {
        setGeminiApiKey('');
        setApiKey('');
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 3 }}>
                ⚙️ Settings
            </Typography>

            {saved && <Alert severity="success" sx={{ mb: 2 }}>Settings saved!</Alert>}

            <Card elevation={3} sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <KeyIcon /> AI Image Analysis (Google Gemini)
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Configure your Google Gemini API key to enable AI-powered image analysis for auto-categorizing issue photos.
                        The free tier provides 15 requests/minute and 1M tokens/day.
                    </Typography>

                    <Stack spacing={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2">Status:</Typography>
                            <Chip
                                label={hasGeminiApiKey() ? 'Configured' : 'Not Configured'}
                                color={hasGeminiApiKey() ? 'success' : 'default'}
                                size="small"
                            />
                        </Box>

                        <TextField
                            label="Gemini API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            fullWidth
                            type="password"
                            placeholder="AIzaSy..."
                            helperText="Get your free API key at https://aistudio.google.com/apikey"
                        />

                        <Stack direction="row" spacing={1}>
                            <Button variant="contained" onClick={handleSave} disabled={!apiKey.trim()}>
                                Save API Key
                            </Button>
                            <Button variant="outlined" color="error" onClick={handleClear}>
                                Clear Key
                            </Button>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            <Card elevation={3}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>How AI Analysis Works</Typography>
                    <Typography variant="body2" paragraph>
                        When a new issue with a photo is reported, the system automatically:
                    </Typography>
                    <ol>
                        <li><Typography variant="body2">Sends the image to Google Gemini for analysis</Typography></li>
                        <li><Typography variant="body2">AI classifies the issue category (Garbage, Roads, Water Leak, etc.)</Typography></li>
                        <li><Typography variant="body2">Provides a confidence score, severity assessment, and descriptive tags</Typography></li>
                        <li><Typography variant="body2">If AI's category differs from citizen's choice, both are shown for admin review</Typography></li>
                    </ol>
                </CardContent>
            </Card>
        </Box>
    );
};

export default SettingsPage;
