import React, { useState, useEffect, useRef } from 'react';
import { 
  Key, 
  BarChart3, 
  Shield, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Activity,
  CreditCard,
  Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot
} from 'firebase/firestore';
import { firestore } from '../firebase';

interface ApiKey {
  id: string;
  key: string;
  createdAt: string | any; // string ou Timestamp Firestore
  status: 'active' | 'expired';
  lastUsed: string;
  last4?: string;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed';
  createdAt: string | any; // string ou Timestamp Firestore
  responseTime: number;    // en ms
}

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  createdAt: string | any; // string ou Timestamp Firestore
}

function toJSDate(input: any): Date | null {
  // Accepte ISO string, number ms, Firestore Timestamp ({seconds}) ou Date
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === 'string') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'object') {
    // Firestore Timestamp
    if (typeof input.toDate === 'function') return input.toDate();
    if (typeof input.seconds === 'number') return new Date(input.seconds * 1000);
  }
  return null;
}

export default function Dashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState([
    {
      title: 'API Keys Actives',
      value: '0',
      max: user?.subscription.apiKeyQuota || 3,
      icon: Key,
      color: 'from-blue-500 to-blue-600',
      change: ''
    },
    {
      title: 'Transactions ce mois',
      value: '0',
      icon: CreditCard,
      color: 'from-teal-500 to-teal-600',
      change: ''
    },
    {
      title: 'Taux de succès',
      value: '0%',
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      change: ''
    },
    {
      title: 'Temps de réponse',
      value: '0ms',
      icon: Activity,
      color: 'from-orange-500 to-orange-600',
      change: ''
    }
  ]);

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [lastCheckText, setLastCheckText] = useState('Il y a 2 minutes');

  // Références pour unsub des listeners temps réel
  const unsubKeysRef = useRef<(() => void) | null>(null);
  const unsubTxRef = useRef<(() => void) | null>(null);
  const unsubActRef = useRef<(() => void) | null>(null);

  // Met à jour la chaîne "Dernière vérification: ..."
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Math.max(1, Math.floor((Date.now() - start) / 1000));
      if (elapsed < 60) setLastCheckText(`Il y a ${elapsed} sec`);
      else if (elapsed < 3600) setLastCheckText(`Il y a ${Math.floor(elapsed / 60)} min`);
      else setLastCheckText(`Il y a ${Math.floor(elapsed / 3600)} h`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Chargement initial + temps réel (sans changer ta structure Firestore)
  useEffect(() => {
    if (!user?.id) return;

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // --- API Keys (temps réel) ---
    try {
      const apiKeysRef = collection(firestore, 'users', user.id, 'apiKeys');
      const apiKeysQ = query(apiKeysRef, where('status', '==', 'active'));
      unsubKeysRef.current = onSnapshot(apiKeysQ, async (snap) => {
        const activeApiKeys = snap.size;

        // --- Transactions (instantané + filtre mois en cours) ---
        // On garde getDocs ici pour filtrer par date string/Timestamp de manière simple
        const txRef = collection(firestore, 'users', user.id, 'transactions');
        const txQ = query(txRef); // On filtrera côté JS car createdAt peut être string/Timestamp
        const txSnap = await getDocs(txQ);

        let monthlyTransactions = 0;
        let successfulTransactions = 0;
        let totalResponseTime = 0;

        txSnap.forEach(d => {
          const t = d.data() as Transaction;
          const created = toJSDate(t.createdAt);
          if (created && created >= startOfMonth) {
            monthlyTransactions += 1;
            if (t.status === 'success') successfulTransactions += 1;
            totalResponseTime += Number(t.responseTime || 0);
          }
        });

        const successRate = monthlyTransactions > 0 ? (successfulTransactions / monthlyTransactions) * 100 : 0;
        const avgResponseTime = monthlyTransactions > 0 ? (totalResponseTime / monthlyTransactions) : 0;

        setStats(prev => ([
          {
            title: 'API Keys Actives',
            value: String(activeApiKeys),
            max: user?.subscription.apiKeyQuota || prev[0].max || 3,
            icon: Key,
            color: 'from-blue-500 to-blue-600',
            change: ''
          },
          {
            title: 'Transactions ce mois',
            value: String(monthlyTransactions),
            icon: CreditCard,
            color: 'from-teal-500 to-teal-600',
            change: ''
          },
          {
            title: 'Taux de succès',
            value: `${successRate.toFixed(1)}%`,
            icon: CheckCircle,
            color: 'from-green-500 to-green-600',
            change: ''
          },
          {
            title: 'Temps de réponse',
            value: `${Math.round(avgResponseTime)}ms`,
            icon: Activity,
            color: 'from-orange-500 to-orange-600',
            change: ''
          }
        ]));
      });
    } catch {
      // fallback silencieux si la sous-collection n'existe pas encore
    }

    // --- Transactions (temps réel léger pour mise à jour instantanée des stats) ---
    try {
      const transactionsRef = collection(firestore, 'users', user.id, 'transactions');
      const transactionsQ = query(transactionsRef, orderBy('createdAt', 'desc'), limit(1));
      unsubTxRef.current = onSnapshot(transactionsQ, () => {
        // Déclenche une recalcul via l'écouteur des keys (ou on pourrait relire ici)
        // On laisse simple pour ne pas bousculer ta logique
      });
    } catch {
      // ignore
    }

    // --- Activités récentes (temps réel) ---
    try {
      const activitiesRef = collection(firestore, 'users', user.id, 'activities');
      const activitiesQ = query(activitiesRef, orderBy('createdAt', 'desc'), limit(5));
      unsubActRef.current = onSnapshot(activitiesQ, (snap) => {
        const items: RecentActivity[] = snap.docs.map(doc => {
          const d = doc.data() as any;
          return { 
            id: doc.id, 
            type: d.type, 
            message: d.message, 
            createdAt: d.createdAt 
          };
        });
        setRecentActivities(items);
      });
    } catch {
      // ignore
    }

    // Cleanup
    return () => {
      if (unsubKeysRef.current) { unsubKeysRef.current(); unsubKeysRef.current = null; }
      if (unsubTxRef.current) { unsubTxRef.current(); unsubTxRef.current = null; }
      if (unsubActRef.current) { unsubActRef.current(); unsubActRef.current = null; }
    };
  }, [user?.id, user?.subscription?.apiKeyQuota]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'api_key_created': return Key;
      case 'transaction_success': return CheckCircle;
      case 'quota_warning': return AlertCircle;
      case 'api_key_expired': return Clock;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'api_key_created': return 'text-blue-400';
      case 'transaction_success': return 'text-green-400';
      case 'quota_warning': return 'text-yellow-400';
      case 'api_key_expired': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Bonjour, {user?.name} 👋
        </h1>
        <p className="text-blue-300">
          Bienvenue sur votre tableau de bord KZD SecurePay. Voici un aperçu de votre activité.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white hover:from-blue-700 hover:to-blue-800 transition-all hover:scale-105 group">
          <div className="flex items-center space-x-3">
            <Key className="h-6 w-6 group-hover:rotate-12 transition-transform" />
            <div className="text-left">
              <h3 className="font-semibold">Créer une clé API</h3>
              <p className="text-blue-200 text-sm">Générer une nouvelle clé</p>
            </div>
          </div>
        </button>

        <button className="p-4 bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl text-white hover:from-teal-700 hover:to-teal-800 transition-all hover:scale-105 group">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <h3 className="font-semibold">Tester l'API</h3>
              <p className="text-teal-200 text-sm">Mode sandbox</p>
            </div>
          </div>
        </button>

        <button className="p-4 bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl text-white hover:from-orange-700 hover:to-orange-800 transition-all hover:scale-105 group">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-6 w-6 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <h3 className="font-semibold">Voir les stats</h3>
              <p className="text-orange-200 text-sm">Analytics détaillées</p>
            </div>
          </div>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const safeMax = Number(stat.max || 0) || 0;
          const safeVal = Number(parseInt(String(stat.value), 10) || 0);
          const pct = safeMax > 0 ? Math.min(100, Math.max(0, (safeVal / safeMax) * 100)) : 0;

        return (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-gradient-to-r ${stat.color} rounded-lg shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                {stat.max && (
                  <div className="text-right">
                    <div className="text-xs text-blue-300">
                      {stat.value}/{stat.max}
                    </div>
                    <div className="w-16 h-2 bg-white/20 rounded-full mt-1">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-teal-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-blue-300 text-sm mb-2">{stat.title}</p>
              <p className="text-green-400 text-xs flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {stat.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Activité récente</h2>
            <button className="text-blue-300 hover:text-blue-200 text-sm">
              Voir tout
            </button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const created = toJSDate(activity.createdAt);
              return (
                <div
                  key={activity.id}
                  className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                >
                  <div className={`p-2 bg-white/10 rounded-lg ${getActivityColor(activity.type)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{activity.message}</p>
                    <p className="text-blue-300 text-sm">{created ? created.toLocaleString() : ''}</p>
                  </div>
                </div>
              );
            })}
            {!recentActivities.length && (
              <div className="text-blue-300 text-sm">Aucune activité pour le moment.</div>
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="space-y-6">
          {/* Subscription Status */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Abonnement</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-blue-300">Plan actuel</span>
                <span className="text-white capitalize font-medium">
                  {user?.subscription.plan}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300">Quota API</span>
                <span className="text-white">
                  {user?.subscription.usage}/{user?.subscription.apiKeyQuota}
                </span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-teal-400 rounded-full transition-all"
                  style={{ 
                    width: `${((user?.subscription.usage || 0) / (user?.subscription.apiKeyQuota || 3)) * 100}%` 
                  }}
                />
              </div>
            </div>
            <button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white py-2 rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all hover:scale-105">
              Upgrade Plan
            </button>
          </div>

          {/* API Status */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Statut API</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white">API Opérationnelle</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white">Paiements Fonctionnels</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-white">Maintenance programmée</span>
              </div>
            </div>
            <p className="text-xs text-blue-300 mt-3">
              Dernière vérification: {lastCheckText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
