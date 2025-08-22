import React, { useState } from 'react';
import { 
  Book, 
  Code, 
  Download, 
  ExternalLink, 
  Copy, 
  Play,
  ChevronRight,
  Shield,
  Key,
  CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Documentation() {
  const [activeTab, setActiveTab] = useState('quickstart');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const navigate = useNavigate();

  const tabs = [
    { id: 'quickstart', name: 'Démarrage rapide', icon: Play },
    { id: 'authentication', name: 'Authentification', icon: Shield },
    { id: 'endpoints', name: 'Endpoints', icon: Code },
    { id: 'examples', name: 'Exemples', icon: Book },
    { id: 'postman', name: 'Postman', icon: Download }
  ];

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, language, id }: { code: string, language: string, id: string }) => (
    <div className="relative">
      <div className="flex items-center justify-between bg-white/5 px-4 py-2 rounded-t-lg border-b border-white/10">
        <span className="text-blue-300 text-sm font-medium">{language}</span>
        <button
          onClick={() => copyCode(code, id)}
          className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors"
        >
          <Copy className="h-4 w-4" />
          <span className="text-sm">{copiedCode === id ? 'Copié!' : 'Copier'}</span>
        </button>
      </div>
      <pre className="bg-black/20 p-4 rounded-b-lg overflow-x-auto">
        <code className="text-green-300 text-sm">{code}</code>
      </pre>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Documentation</h1>
        <p className="text-blue-300">
          Guide complet pour intégrer l'API KZD SecurePay dans vos applications
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 sticky top-24">
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
            
            <div className="mt-6 pt-6 border-t border-white/20">
              <h3 className="text-white font-semibold mb-3">Ressources</h3>
              <div className="space-y-2">
                <a
                  href="#"
                  className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>API Reference</span>
                </a>
                <a
                  href="#"
                  className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 text-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Postman Collection</span>
                </a>
                <a
                  href="#"
                  className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 text-sm"
                >
                  <Book className="h-4 w-4" />
                  <span>FAQ</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
            
            {/* Quick Start */}
            {activeTab === 'quickstart' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Démarrage rapide</h2>
                  <p className="text-blue-300 mb-6">
                    Intégrez l'API KZD SecurePay en quelques minutes. Suivez ces étapes pour effectuer votre première transaction.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">1</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">Créer une clé API</h3>
                      <p className="text-blue-300 mb-4">
                        Générez votre première clé API depuis l'onglet "API Keys". Commencez avec une clé de test.
                      </p>
                      <button
                        onClick={() => navigate('/apikey')}
                        className="bg-gradient-to-r from-blue-600 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all"
                      >
                        Créer une clé API
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">2</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">Configuration de base</h3>
                      <p className="text-blue-300 mb-4">
                        Configurez vos headers d'authentification pour toutes les requêtes.
                      </p>
                      <CodeBlock
                        id="config"
                        language="JavaScript"
                        code={`const headers = {
  'x-api-key': 'your-api-key-here',
  'x-client-secret': 'your-client-secret-here',
  'Content-Type': 'application/json'
};

const baseURL = 'https://api.kazadi-securepay.com';`}
                      />
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">3</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">Votre première transaction</h3>
                      <p className="text-blue-300 mb-4">
                        Effectuez votre première transaction sécurisée.
                      </p>
                      <CodeBlock
                        id="first-transaction"
                        language="JavaScript"
                        code={`const transactionData = {
  timestamp: Math.floor(Date.now() / 1000),
  deviceId: "unique-device-identifier",
  cardNumber: "4242424242424242",
  cvv: "123",
  amount: 42.00,
  nonce: "unique-string-" + Date.now()
};

const response = await fetch(\`\${baseURL}/api/transaction\`, {
  method: 'POST',
  headers: headers,
  body: JSON.stringify(transactionData)
});

const result = await response.json();
console.log('Transaction result:', result);`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Authentication */}
            {activeTab === 'authentication' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Authentification</h2>
                  <p className="text-blue-300 mb-6">
                    L'API utilise un système d'authentification double avec clé API et secret client pour une sécurité maximale.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <Shield className="h-6 w-6 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">Headers requis</h3>
                    </div>
                    <p className="text-blue-300 mb-4">
                      Chaque requête doit inclure les headers suivants :
                    </p>
                    <CodeBlock
                      id="auth-headers"
                      language="HTTP"
                      code={`x-api-key: kzd_test_1234567890abcdef
x-client-secret: kzd_secret_abcdef1234567890
Content-Type: application/json`}
                    />
                  </div>

                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <Key className="h-6 w-6 text-orange-400" />
                      <h3 className="text-lg font-semibold text-white">Types de clés</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-white font-medium mb-2">Clés de test</h4>
                        <ul className="text-blue-300 space-y-1 list-disc list-inside">
                          <li>Préfixe: <code className="bg-white/10 px-2 py-1 rounded">kzd_test_</code></li>
                          <li>Durée de vie: 2 heures</li>
                          <li>Utilisation: Tests et développement</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-2">Clés de production</h4>
                        <ul className="text-blue-300 space-y-1 list-disc list-inside">
                          <li>Préfixe: <code className="bg-white/10 px-2 py-1 rounded">kzd_prod_</code></li>
                          <li>Durée de vie: 24 heures (configurable)</li>
                          <li>Utilisation: Transactions réelles</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Endpoints */}
            {activeTab === 'endpoints' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Endpoints API</h2>
                  <p className="text-blue-300 mb-6">
                    Liste complète des endpoints disponibles dans l'API KZD SecurePay.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Transaction Endpoint */}
                  <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">POST</span>
                      <code className="text-white text-lg">/api/transaction</code>
                    </div>
                    <p className="text-blue-300 mb-4">Traite une transaction de paiement sécurisée</p>
                    
                    <h4 className="text-white font-semibold mb-2">Paramètres</h4>
                    <CodeBlock
                      id="transaction-params"
                      language="JSON"
                      code={`{
  "timestamp": 1733452345,
  "deviceId": "id-unique-device",
  "cardNumber": "4242424242424242",
  "cvv": "123",
  "amount": 42.00,
  "nonce": "unique-string"
}`}
                    />
                    
                    <h4 className="text-white font-semibold mb-2 mt-6">Réponse</h4>
                    <CodeBlock
                      id="transaction-response"
                      language="JSON"
                      code={`{
  "status": "Transaction traitée",
  "transactionId": "uuid-v4",
  "cvk": "hash",
  "encryptedData": "iv:enc:tag",
  "debug": {
    "cardMasked": "••••••••••••4242"
  }
}`}
                    />
                  </div>

                  {/* Health Check */}
                  <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">GET</span>
                      <code className="text-white text-lg">/api/health</code>
                    </div>
                    <p className="text-blue-300 mb-4">Vérification du statut de l'API</p>
                    
                    <h4 className="text-white font-semibold mb-2">Réponse</h4>
                    <CodeBlock
                      id="health-response"
                      language="JSON"
                      code={`{
  "status": "healthy",
  "timestamp": "2025-01-15T12:00:00Z",
  "version": "1.0.0"
}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Examples */}
            {activeTab === 'examples' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Exemples d'intégration</h2>
                  <p className="text-blue-300 mb-6">
                    Exemples pratiques dans différents langages de programmation.
                  </p>
                </div>

                <div className="space-y-8">
                  {/* JavaScript/Node.js */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">JavaScript / Node.js</h3>
                    <CodeBlock
                      id="js-example"
                      language="JavaScript"
                      code={`const axios = require('axios');

class KZDSecurePay {
  constructor(apiKey, clientSecret) {
    this.apiKey = apiKey;
    this.clientSecret = clientSecret;
    this.baseURL = 'https://api.kazadi-securepay.com';
  }

  async processTransaction(transactionData) {
    const headers = {
      'x-api-key': this.apiKey,
      'x-client-secret': this.clientSecret,
      'Content-Type': 'application/json'
    };

    const payload = {
      ...transactionData,
      timestamp: Math.floor(Date.now() / 1000),
      nonce: this.generateNonce()
    };

    try {
      const response = await axios.post(
        \`\${this.baseURL}/api/transaction\`,
        payload,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(\`Transaction failed: \${error.message}\`);
    }
  }

  generateNonce() {
    return 'nonce_' + Math.random().toString(36) + Date.now();
  }
}

// Usage
const payment = new KZDSecurePay('your-api-key', 'your-secret');
const result = await payment.processTransaction({
  deviceId: 'device-123',
  cardNumber: '4242424242424242',
  cvv: '123',
  amount: 99.99
});`}
                    />
                  </div>

                  {/* Python */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-4">Python</h3>
                    <CodeBlock
                      id="python-example"
                      language="Python"
                      code={`import requests
import time
import random
import string

class KZDSecurePay:
    def __init__(self, api_key, client_secret):
        self.api_key = api_key
        self.client_secret = client_secret
        self.base_url = 'https://api.kazadi-securepay.com'
    
    def process_transaction(self, transaction_data):
        headers = {
            'x-api-key': self.api_key,
            'x-client-secret': self.client_secret,
            'Content-Type': 'application/json'
        }
        
        payload = {
            **transaction_data,
            'timestamp': int(time.time()),
            'nonce': self._generate_nonce()
        }
        
        response = requests.post(
            f'{self.base_url}/api/transaction',
            json=payload,
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f'Transaction failed: {response.text}')
    
    def _generate_nonce(self):
        return ''.join(random.choices(string.ascii_letters + string.digits, k=16))

# Usage
payment = KZDSecurePay('your-api-key', 'your-secret')
result = payment.process_transaction({
    'deviceId': 'device-123',
    'cardNumber': '4242424242424242',
    'cvv': '123',
    'amount': 99.99
})`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Postman */}
            {activeTab === 'postman' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">Collection Postman</h2>
                  <p className="text-blue-300 mb-6">
                    Testez rapidement l'API avec notre collection Postman pré-configurée.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-xl p-6 text-white">
                    <div className="flex items-center space-x-4">
                      <Download className="h-12 w-12" />
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Collection KZD SecurePay</h3>
                        <p className="text-blue-100 mb-4">
                          Collection complète avec tous les endpoints et exemples
                        </p>
                        <div className="flex items-center space-x-4">
                          <button className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all">
                            Télécharger Collection
                          </button>
                          <button className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all">
                            Télécharger Environnement
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <h4 className="text-white font-semibold mb-3">Ce qui est inclus</h4>
                      <ul className="text-blue-300 space-y-2">
                        <li className="flex items-center space-x-2">
                          <ChevronRight className="h-4 w-4" />
                          <span>Endpoint de transaction complet</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <ChevronRight className="h-4 w-4" />
                          <span>Tests automatisés</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <ChevronRight className="h-4 w-4" />
                          <span>Variables d'environnement</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <ChevronRight className="h-4 w-4" />
                          <span>Exemples de requêtes</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                      <h4 className="text-white font-semibold mb-3">Configuration rapide</h4>
                      <ol className="text-blue-300 space-y-2">
                        <li className="flex items-start space-x-2">
                          <span className="bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center mt-0.5">1</span>
                          <span>Importer la collection dans Postman</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center mt-0.5">2</span>
                          <span>Configurer vos clés API</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center mt-0.5">3</span>
                          <span>Lancer vos premiers tests</span>
                        </li>
                      </ol>
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-yellow-500/20 rounded-full p-1">
                        <Download className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-1">Variables d'environnement</h4>
                        <p className="text-blue-300 text-sm">
                          N'oubliez pas de configurer vos variables d'environnement avec vos vraies clés API 
                          après l'import de la collection.
                        </p>
                      </div>
                    </div>
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
