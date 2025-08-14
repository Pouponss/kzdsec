import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Key, 
  Settings, 
  Trash2, 
  Download,
  Bell,
  Eye,
  EyeOff,
  Save,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notifications, setNotifications] = useState({
    apiAlerts: true,
    usageAlerts: true,
    securityAlerts: true,
    productUpdates: false
  });

  const tabs = [
    { id: 'account', name: 'Informations du compte', icon: User },
    { id: 'security', name: 'Sécurité', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'data', name: 'Données & Export', icon: Download }
  ];

  const handleSaveProfile = () => {
    // Simulate saving profile
    setIsEditing(false);
    // You would typically make an API call here
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      // Handle account deletion
      logout();
    }
  };

  const exportData = (type: string) => {
    // Simulate data export
    const data = {
      user: user,
      exportDate: new Date().toISOString(),
      type: type
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kazadi-${type}-export.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Profil utilisateur</h1>
        <p className="text-blue-300">
          Gérez vos informations personnelles, paramètres de sécurité et préférences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 sticky top-24">
            {/* User Info */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">{user?.name}</h3>
              <p className="text-blue-300 text-sm">{user?.email}</p>
              <div className="mt-2">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs capitalize">
                  {user?.subscription.plan}
                </span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-3 w-full text-left px-4 py-3 rounded-lg transition-all hover:scale-105 ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-blue-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
            
            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Informations du compte</h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all hover:scale-105"
                  >
                    <Settings className="h-5 w-5" />
                    <span>{isEditing ? 'Annuler' : 'Modifier'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-blue-300 text-sm font-medium mb-2">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-blue-300 text-sm font-medium mb-2">
                      Adresse email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h4 className="text-white font-medium mb-1">ID Utilisateur</h4>
                    <code className="text-blue-300 text-sm">{user?.id}</code>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h4 className="text-white font-medium mb-1">Membre depuis</h4>
                    <span className="text-blue-300 text-sm">
                      {new Date(user?.createdAt || '').toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h4 className="text-white font-medium mb-1">Plan actuel</h4>
                    <span className="text-blue-300 text-sm capitalize">{user?.subscription.plan}</span>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all hover:scale-105"
                    >
                      <Save className="h-5 w-5" />
                      <span>Sauvegarder</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-white">Sécurité</h2>

                {/* Change Password */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white">Changer le mot de passe</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-blue-300 text-sm font-medium mb-2">
                        Mot de passe actuel
                      </label>
                      <input
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-blue-300 text-sm font-medium mb-2">
                          Nouveau mot de passe
                        </label>
                        <input
                          type="password"
                          value={formData.newPassword}
                          onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400"
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <label className="block text-blue-300 text-sm font-medium mb-2">
                          Confirmer le mot de passe
                        </label>
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all hover:scale-105">
                      Mettre à jour le mot de passe
                    </button>
                  </div>
                </div>

                {/* Security Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">État de la sécurité</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Shield className="h-5 w-5 text-green-400" />
                        <span className="text-white">Authentification à deux facteurs</span>
                      </div>
                      <button className="text-green-400 hover:text-green-300 text-sm">
                        Configuré
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Key className="h-5 w-5 text-blue-400" />
                        <span className="text-white">Clés API actives</span>
                      </div>
                      <span className="text-blue-400 text-sm">2 clés</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-white">Préférences de notification</h2>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <h4 className="text-white font-medium">Alertes API</h4>
                      <p className="text-blue-300 text-sm">Notifications en cas d'erreur API ou de limites atteintes</p>
                    </div>
                    <button
                      onClick={() => setNotifications({...notifications, apiAlerts: !notifications.apiAlerts})}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications.apiAlerts ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        notifications.apiAlerts ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <h4 className="text-white font-medium">Alertes d'usage</h4>
                      <p className="text-blue-300 text-sm">Notifications quand vous approchez de vos limites</p>
                    </div>
                    <button
                      onClick={() => setNotifications({...notifications, usageAlerts: !notifications.usageAlerts})}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications.usageAlerts ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        notifications.usageAlerts ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <h4 className="text-white font-medium">Alertes de sécurité</h4>
                      <p className="text-blue-300 text-sm">Notifications d'activité suspecte ou de nouvelles connexions</p>
                    </div>
                    <button
                      onClick={() => setNotifications({...notifications, securityAlerts: !notifications.securityAlerts})}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications.securityAlerts ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        notifications.securityAlerts ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <h4 className="text-white font-medium">Mises à jour produit</h4>
                      <p className="text-blue-300 text-sm">Nouvelles fonctionnalités et améliorations</p>
                    </div>
                    <button
                      onClick={() => setNotifications({...notifications, productUpdates: !notifications.productUpdates})}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications.productUpdates ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        notifications.productUpdates ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Data Export Tab */}
            {activeTab === 'data' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-white">Données & Export</h2>

                <div className="space-y-6">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Exporter vos données</h3>
                    <p className="text-blue-300 mb-4">
                      Téléchargez une copie de toutes vos données stockées sur Kazadi SecurePay
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => exportData('profile')}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all hover:scale-105"
                      >
                        <Download className="h-4 w-4" />
                        <span>Profil utilisateur</span>
                      </button>
                      <button
                        onClick={() => exportData('api-keys')}
                        className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-all hover:scale-105"
                      >
                        <Download className="h-4 w-4" />
                        <span>Clés API</span>
                      </button>
                      <button
                        onClick={() => exportData('logs')}
                        className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-all hover:scale-105"
                      >
                        <Download className="h-4 w-4" />
                        <span>Logs d'activité</span>
                      </button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="h-6 w-6 text-red-400" />
                        <h3 className="text-lg font-semibold text-white">Zone de danger</h3>
                      </div>
                      <button
                        onClick={() => setShowDangerZone(!showDangerZone)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        {showDangerZone ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>

                    {showDangerZone && (
                      <div className="space-y-4">
                        <p className="text-red-300 text-sm">
                          Ces actions sont irréversibles. Assurez-vous de comprendre les conséquences.
                        </p>
                        <button
                          onClick={handleDeleteAccount}
                          className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-all hover:scale-105"
                        >
                          <Trash2 className="h-5 w-5" />
                          <span>Supprimer mon compte</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}