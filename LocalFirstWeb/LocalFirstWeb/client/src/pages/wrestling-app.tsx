import { useState } from 'react';
import { Trophy, Users, Weight, Play, History, Plus, UserX, Settings } from 'lucide-react';
import { RosterManagement } from '@/components/wrestling/roster-management';
// import { OpponentsManagement } from '@/components/wrestling/opponents-management';
import { WeighInsManagement } from '@/components/wrestling/weigh-ins-management';
import { MatchCreation } from '@/components/wrestling/match-creation';
import { MatchControl } from '@/components/wrestling/match-control';
import { MatchReview } from '@/components/wrestling/match-review';
import { SettingsManagement } from '@/components/wrestling/settings-management';
import { DualMeetCreation } from '@/components/wrestling/dual-meet-creation';

type TabType = 'roster' | 'opponents' | 'weigh-ins' | 'matches' | 'dual-meet' | 'match-control' | 'review' | 'settings';

export default function WrestlingApp() {
  const [activeTab, setActiveTab] = useState<TabType>('roster');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedDualMeetId, setSelectedDualMeetId] = useState<string | null>(null);

  const tabs = [
    { id: 'roster' as TabType, label: 'Roster', icon: Users },
    { id: 'opponents' as TabType, label: 'Opponents', icon: UserX },
    { id: 'weigh-ins' as TabType, label: 'Weigh-ins', icon: Weight },
    { id: 'matches' as TabType, label: 'Matches', icon: Plus },
    { id: 'dual-meet' as TabType, label: 'Dual Meet', icon: Trophy },
    { id: 'match-control' as TabType, label: 'Match Control', icon: Play },
    { id: 'review' as TabType, label: 'Review', icon: History },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  const handleMatchCreated = (matchId: string) => {
    setSelectedMatchId(matchId);
    setActiveTab('match-control');
  };

  const handleDualMeetCreated = (dualMeetId: string) => {
    setSelectedDualMeetId(dualMeetId);
    // Stay on dual meet tab to show the created dual meet
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'roster':
        return <RosterManagement />;
      case 'opponents':
        return (
          <div className="p-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Opponent Teams</h2>
              <div className="text-center p-8">
                <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Opponent Team Management</h3>
                <p className="text-gray-600 mb-4">
                  Create and manage opponent teams you compete against. These teams will auto-suggest when creating matches.
                </p>
                <p className="text-sm text-gray-500">Feature ready - component loading...</p>
              </div>
            </div>
          </div>
        );
      case 'weigh-ins':
        return <WeighInsManagement />;
      case 'matches':
        return <MatchCreation onMatchCreated={handleMatchCreated} />;
      case 'dual-meet':
        return <DualMeetCreation onBack={() => setActiveTab('matches')} onDualMeetCreated={handleDualMeetCreated} />;
      case 'match-control':
        return <MatchControl onBack={() => setActiveTab('matches')} selectedMatchId={selectedMatchId || undefined} />;
      case 'review':
        return <MatchReview />;
      case 'settings':
        return <SettingsManagement />;
      default:
        return <RosterManagement />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center">
            <Trophy className="h-6 w-6 text-primary mr-2" />
            Wrestling Match Manager
          </h1>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b overflow-x-auto">
        <div className="flex min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap flex items-center transition-colors ${
                  isActive
                    ? 'border-b-3 border-primary text-primary'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                <Icon className="h-4 w-4 mr-1" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {renderTabContent()}
      </main>
    </div>
  );
}
