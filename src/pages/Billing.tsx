import React, { useState } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  Crown,
  ArrowUp,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Billing() {
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  const plans = [
    {
      name: 'Free',
      price: { monthly: 0, yearly: 0 },
      description: 'Parfait pour débuter et tester l\'API',
      features: [
        '3 clés API par mois',
        '1,000 requêtes/mois',
        'Support par email',
        'Documentation complète',
        'Mode sandbox',
        'Clés de test (2h)'
      ],
      limitations: [
        'Pas de clés de production',
        'Support standard uniquement'
      ],
      current: user?.subscription.plan === 'free',
      popular: false,
      color: 'from-gray-500 to-gray-600'
    },
    {
      name: 'Pro',
      price: { monthly: null, yearly: null },
      description: 'Pour les développeurs et petites équipes',
      features: [
        '10 clés API par mois',
        '50,000 requêtes/mois',
        'Clés de production (24h)',
        'Support prioritaire',
        'Analytics avancées',
        'Webhooks',
        'SLA 99.9%'
      ],
      limitations: [],
      current: user?.subscription.plan === 'pro',
      popular: true,
      color: 'from-blue-500 to-teal-600'
    },
    {
      name: 'Enterprise',
      price: { monthly: null, yearly: null },
      description: 'Pour les grandes entreprises et volumes élevés',
      features: [
        'Clés API illimitées',
        '1,000,000+ requêtes/mois',
        'Clés personnalisées',
        'Support dédié 24/7',
        'Manager de compte',
        'Custom SLA',
        'Infrastructure dédiée',
        'Conformité bancaire'
      ],
      limitations: [],
      current: user?.subscription.plan === 'enterprise',
      popular: false,
      color: 'from-purple-500 to-pink-600'
    }
  ];

  const [invoices, setInvoices] = useState<any[]>([]);
  const [usageStats, setUsageStats] = useState<any[]>([]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-400 bg-green-400/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'failed':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'pro':
        return <Zap className="h-6 w-6" />;
      case 'enterprise':
        return <Crown className="h-6 w-6" />;
      default:
        return <Star className="h-6 w-6" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Facturation & Abonnements</h1>
        <p className="text-blue-300">
          Gérez votre abonnement, consultez votre utilisation et vos factures
        </p>
      </div>

      {/* Current Plan & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center space-x-3 mb-4">
            {getPlanIcon(user?.subscription.plan || 'free')}
            <h3 className="text-lg font-semibold text-white">Plan actuel</h3>
          </div>
          <div className="space-y-2">
            <span className="text-2xl font-bold text-white capitalize">
              {user?.subscription.plan}
            </span>
            <p className="text-blue-300 text-sm">
              {user?.subscription.plan === 'free' ? 'Gratuit' : `Licence`}
            </p>
          </div>
        </div>

        {usageStats.map((stat, index) => {
          const Icon = stat.icon;
          const percentage = stat.limit ? (stat.current / stat.limit) * 100 : 0;
          
          return (
            <div key={index} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-3">
                <Icon className={`h-6 w-6 ${stat.color}`} />
                <h3 className="text-lg font-semibold text-white">{stat.metric}</h3>
              </div>
              <div className="space-y-2">
                <span className="text-2xl font-bold text-white">
                  {stat.unit === '$' && stat.unit}{stat.current.toLocaleString()}
                  {stat.unit !== '$' && stat.unit}
                </span>
                {stat.limit && (
                  <>
                    <p className="text-blue-300 text-sm">/ {stat.limit.toLocaleString()}</p>
                    <div className="w-full h-2 bg-white/20 rounded-full">
                      <div 
                        className={`h-full bg-gradient-to-r ${ 
                          percentage > 80 ? 'from-red-500 to-red-600' :
                          percentage > 60 ? 'from-yellow-500 to-yellow-600' :
                          'from-blue-500 to-teal-600'
                        } rounded-full transition-all`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Plans */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Plans disponibles</h2>
          <div className="flex items-center bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${ 
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${ 
                billingPeriod === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-300 hover:text-white'
              }`}
            >
              Annuel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`bg-white/10 backdrop-blur-md rounded-xl p-6 border relative transition-all hover:scale-105 ${ 
                plan.popular
                  ? 'border-blue-400 ring-2 ring-blue-400/20'
                  : 'border-white/20 hover:border-white/30'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-4 py-1 rounded-full text-xs font-medium">
                    Recommandé
                  </span>
                </div>
              )}

              {plan.current && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Actuel
                  </span>
                </div>
              )}

              <div className="mb-6">
                <div className={`w-12 h-12 bg-gradient-to-r ${plan.color} rounded-lg flex items-center justify-center mb-4`}>
                  {getPlanIcon(plan.name)}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-blue-300 text-sm mb-4">{plan.description}</p>
                
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-white">
                    {plan.price[billingPeriod] !== null ? `$${plan.price[billingPeriod]}` : 'Licence'}
                  </span>
                  {plan.price[billingPeriod] !== null &&
                    <span className="text-blue-300 text-sm">
                      /{billingPeriod === 'monthly' ? 'mois' : 'an'}
                    </span>
                  }
                  {billingPeriod === 'yearly' && plan.price.yearly !== null && plan.price.monthly !== null && plan.price.yearly < plan.price.monthly * 12 && (
                    <span className="text-green-400 text-xs">
                      -17%
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-300 text-sm">{feature}</span>
                  </div>
                ))}
                
                {plan.limitations.map((limitation, idx) => (
                  <div key={idx} className="flex items-start space-x-3 opacity-60">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <span className="text-blue-300 text-sm">{limitation}</span>
                  </div>
                ))}
              </div>

              <button
                disabled={plan.current}
                className={`w-full py-3 rounded-lg font-medium transition-all ${ 
                  plan.current
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-gradient-to-r from-blue-600 to-teal-600 text-white hover:from-blue-700 hover:to-teal-700 hover:scale-105'
                    : 'bg-white/10 text-blue-300 border border-white/20 hover:bg-white/15 hover:text-white hover:scale-105'
                }`}
              >
                {plan.current ? (
                  'Plan actuel'
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <ArrowUp className="h-5 w-5" />
                    <span>Passer au {plan.name}</span>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Method */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Méthode de paiement</h3>
          
          {user?.subscription.plan !== 'free' ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">VISA</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">•••• •••• •••• 4242</p>
                  <p className="text-blue-300 text-sm">Expire 12/2027</p>
                </div>
                <button className="text-blue-300 hover:text-blue-200 text-sm">
                  Modifier
                </button>
              </div>
              
              <button className="w-full bg-white/10 text-blue-300 py-2 rounded-lg hover:bg-white/15 transition-all border border-white/20">
                Ajouter une méthode de paiement
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <CreditCard className="h-12 w-12 text-blue-300 mx-auto mb-3" />
              <p className="text-blue-300 mb-4">
                Aucune méthode de paiement requise pour le plan gratuit
              </p>
              <button className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all hover:scale-105">
                Upgrader pour ajouter
              </button>
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Factures récentes</h3>
            <button className="text-blue-300 hover:text-blue-200 text-sm">
              Voir toutes
            </button>
          </div>

          {user?.subscription.plan !== 'free' ? (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      <span className="text-white font-medium">{invoice.id}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status === 'paid' ? 'Payée' : invoice.status}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-white font-medium">${invoice.amount}</span>
                    <button className="p-2 text-blue-300 hover:text-blue-200 hover:bg-white/10 rounded-lg transition-all">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <DollarSign className="h-6 w-6 text-blue-400" />
              </div>
              <p className="text-blue-300">
                Aucune facture pour le plan gratuit
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}