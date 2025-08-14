import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Filter,
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';

export default function Usage() {
  const [timeRange, setTimeRange] = useState('7d');
  
  const [stats, setStats] = useState([
    {
      title: 'Requêtes totales',
      value: '0',
      change: '',
      changeType: 'positive',
      period: 'vs période précédente'
    },
    {
      title: 'Requêtes réussies',
      value: '0',
      change: '0%',
      changeType: 'positive',
      period: 'taux de succès'
    },
    {
      title: 'Temps de réponse moyen',
      value: '0ms',
      change: '',
      changeType: 'positive',
      period: 'vs période précédente'
    },
    {
      title: 'Requêtes échouées',
      value: '0',
      change: '',
      changeType: 'positive',
      period: 'vs période précédente'
    }
  ]);

  const [recentRequests, setRecentRequests] = useState<any[]>([]);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400 bg-green-400/20';
      case 'error':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-yellow-400 bg-yellow-400/20';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics & Usage</h1>
          <p className="text-blue-300">
            Suivez les performances et l'utilisation de vos API keys
          </p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white/10 text-blue-300 px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-blue-400"
          >
            <option value="1d">Dernières 24h</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
            <option value="90d">90 derniers jours</option>
          </select>
          <button className="flex items-center space-x-2 bg-white/10 text-blue-300 px-4 py-2 rounded-lg hover:bg-white/15 transition-all">
            <RefreshCw className="h-5 w-5" />
            <span>Actualiser</span>
          </button>
          <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all hover:scale-105">
            <Download className="h-5 w-5" />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all hover:scale-105"
          >
            <h3 className="text-lg font-semibold text-white mb-2">{stat.title}</h3>
            <div className="flex items-end space-x-2 mb-2">
              <span className="text-3xl font-bold text-white">{stat.value}</span>
              <span className={`text-sm px-2 py-1 rounded-full ${
                stat.changeType === 'positive' ? 'text-green-400 bg-green-400/20' : 'text-red-400 bg-red-400/20'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-blue-300 text-sm">{stat.period}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Request Volume Chart */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Volume des requêtes</h2>
            <BarChart3 className="h-6 w-6 text-blue-400" />
          </div>
          <div className="space-y-4">
            {/* Simplified chart representation */}
            <div className="text-center text-blue-300 py-8">Les données du graphique apparaîtront ici</div>
          </div>
        </div>

        {/* Response Time Chart */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Temps de réponse</h2>
            <Activity className="h-6 w-6 text-teal-400" />
          </div>
          <div className="space-y-4">
            {/* Simplified response time chart */}
            <div className="text-center text-blue-300 py-8">Les données du graphique apparaîtront ici</div>
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Requêtes récentes</h2>
          <button className="flex items-center space-x-2 text-blue-300 hover:text-blue-200">
            <Filter className="h-5 w-5" />
            <span>Filtrer</span>
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left text-blue-300 font-medium py-3 px-4">Statut</th>
                <th className="text-left text-blue-300 font-medium py-3 px-4">Endpoint</th>
                <th className="text-left text-blue-300 font-medium py-3 px-4">Méthode</th>
                <th className="text-left text-blue-300 font-medium py-3 px-4">Temps de réponse</th>
                <th className="text-left text-blue-300 font-medium py-3 px-4">Heure</th>
                <th className="text-left text-blue-300 font-medium py-3 px-4">Clé API</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-white/10 hover:bg-white/5 transition-all"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(request.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status === 'success' ? 'Succès' : 'Erreur'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <code className="text-white bg-white/10 px-2 py-1 rounded text-sm">
                      {request.endpoint}
                    </code>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-white font-medium">{request.method}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-sm ${
                      parseFloat(request.responseTime) < 200 ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {request.responseTime}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-blue-300">{formatDate(request.timestamp)}</span>
                  </td>
                  <td className="py-4 px-4">
                    <code className="text-blue-300 text-sm">{request.apiKey}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 flex justify-center">
          <button className="text-blue-300 hover:text-blue-200 transition-colors">
            Voir plus de requêtes
          </button>
        </div>
      </div>
    </div>
  );
}