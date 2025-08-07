import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Settings, Globe, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Common US timezones for wrestling meets
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'UTC-5/-4' },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: 'UTC-6/-5' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: 'UTC-7/-6' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)', offset: 'UTC-7' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'UTC-8/-7' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST)', offset: 'UTC-9/-8' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', offset: 'UTC-10' },
];

export function SettingsManagement() {
  const { toast } = useToast();
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Load saved timezone from localStorage
  useEffect(() => {
    const savedTimezone = localStorage.getItem('wrestling-app-timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSelectedTimezone(savedTimezone);
  }, []);

  // Update current time display
  useEffect(() => {
    const updateTime = () => {
      if (selectedTimezone) {
        const now = new Date();
        const timeString = now.toLocaleString('en-US', {
          timeZone: selectedTimezone,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        });
        setCurrentTime(timeString);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [selectedTimezone]);

  const handleSaveTimezone = () => {
    if (!selectedTimezone) {
      toast({ title: 'Please select a timezone', variant: 'destructive' });
      return;
    }

    localStorage.setItem('wrestling-app-timezone', selectedTimezone);
    toast({ 
      title: 'Timezone updated successfully',
      description: `All timestamps will now use ${TIMEZONES.find(tz => tz.value === selectedTimezone)?.label}`
    });
  };

  const getTimezoneInfo = (timezoneValue: string) => {
    return TIMEZONES.find(tz => tz.value === timezoneValue);
  };

  const detectUserTimezone = () => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSelectedTimezone(detectedTimezone);
    toast({ 
      title: 'Timezone detected',
      description: `Set to ${detectedTimezone} based on your system settings`
    });
  };

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">App Settings</h2>
            <p className="text-gray-600">Configure timezone and application preferences</p>
          </div>
          <Settings className="h-8 w-8 text-gray-400" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Timezone Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Timezone Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="timezone">Select Your Timezone</Label>
                <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your timezone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((timezone) => (
                      <SelectItem key={timezone.value} value={timezone.value}>
                        <div className="flex justify-between items-center w-full">
                          <span>{timezone.label}</span>
                          <Badge variant="outline" className="ml-2">
                            {timezone.offset}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Button onClick={detectUserTimezone} variant="outline" className="flex-1">
                  <Clock className="h-4 w-4 mr-2" />
                  Auto-Detect
                </Button>
                <Button onClick={handleSaveTimezone} disabled={!selectedTimezone} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>

              {selectedTimezone && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Label className="text-sm font-medium text-gray-600">Selected Timezone</Label>
                  <p className="font-medium">{getTimezoneInfo(selectedTimezone)?.label || selectedTimezone}</p>
                  <p className="text-sm text-gray-500">{getTimezoneInfo(selectedTimezone)?.offset}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Time Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Current Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentTime ? (
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-blue-600 mb-2">
                    {new Date().toLocaleTimeString('en-US', {
                      timeZone: selectedTimezone,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date().toLocaleDateString('en-US', {
                      timeZone: selectedTimezone,
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <Badge variant="outline" className="mt-2">
                    {selectedTimezone}
                  </Badge>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Select a timezone to see current time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timezone Impact Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Why Timezone Matters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">Match Scheduling</h4>
                <p className="text-blue-800">Match times and weigh-in deadlines use your selected timezone</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-1">Weight Tracking</h4>
                <p className="text-green-800">Practice weigh-ins and records are timestamped accurately</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-1">Video Recording</h4>
                <p className="text-purple-800">Match recordings include correct local timestamps</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}