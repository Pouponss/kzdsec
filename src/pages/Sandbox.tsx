import React, { useState } from 'react';

interface ApiResponse {
  status: string;
  transactionId: string;
  cvk: string;
  encryptedData: string;
  debug: {
    cardMasked: string;
    processingTime: string;
  };
}
import {
  Play,
  Code,
  Settings,
  RefreshCw,
  Copy,
  CheckCircle,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';

export default function Sandbox() {
  const [isLoading, setIsLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [formData, setFormData] = useState({
    deviceId: 'sandbox-device-' + Math.random().toString(36).substr(2, 9),
    cardNumber: '',
    cvv: '',
    amount: ''
  });
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowResponse(false);

    // TODO: Implement API call
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const generateRandomCard = () => {
    const testCards = [
      { number: '4242424242424242', cvv: '123', type: 'Visa' },
      { number: '5555555555554444', cvv: '456', type: 'Mastercard' },
      { number: '378282246310005', cvv: '789', type: 'American Express' },
      { number: '6011111111111117', cvv: '321', type: 'Discover' }
    ];
    
    const randomCard = testCards[Math.floor(Math.random() * testCards.length)];
    setFormData({
      ...formData,
      cardNumber: randomCard.number,
      cvv: randomCard.cvv
    });
  };

  const requestPayload = {
    timestamp: Math.floor(Date.now() / 1000),
    deviceId: formData.deviceId,
    cardNumber: formData.cardNumber,
    cvv: formData.cvv,
    amount: parseFloat(formData.amount),
    nonce: "nonce_" + Date.now()
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">API Sandbox</h1>
        <p className="text-blue-300">
          Testez l'API Kazadi SecurePay en temps réel avec des données de test sécurisées
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Request Panel */}
        <div className="space-y-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Test de Transaction</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={generateRandomCard}
                  className="flex items-center space-x-2 bg-white/10 text-blue-300 px-3 py-2 rounded-lg hover:bg-white/15 transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm">Carte aléatoire</span>
                </button>
                <div className="bg-green-500/20 text-green-300 px-3 py-2 rounded-lg text-sm">
                  Mode Sandbox
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-blue-300 text-sm font-medium mb-2">
                  Device ID
                </label>
                <input
                  type="text"
                  value={formData.deviceId}
                  onChange={(e) => setFormData({...formData, deviceId: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400"
                  placeholder="Identifiant unique du device"
                />
              </div>

              <div>
                <label className="block text-blue-300 text-sm font-medium mb-2">
                  Numéro de carte
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400 pr-12"
                    placeholder="4242424242424242"
                    maxLength={19}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSensitive(!showSensitive)}
                    className="absolute right-3 top-3 text-blue-300 hover:text-blue-200"
                  >
                    {showSensitive ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-blue-300 text-sm font-medium mb-2">
                    CVV
                  </label>
                  <input
                    type={showSensitive ? "text" : "password"}
                    value={formData.cvv}
                    onChange={(e) => setFormData({...formData, cvv: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400"
                    placeholder="123"
                    maxLength={4}
                  />
                </div>

                <div>
                  <label className="block text-blue-300 text-sm font-medium mb-2">
                    Montant (CAD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:border-blue-400"
                    placeholder="99.99"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white font-medium py-3 rounded-lg hover:from-blue-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Traitement...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Play className="h-5 w-5" />
                    <span>Traiter la transaction</span>
                  </div>
                )}
              </button>
            </form>
          </div>

          {/* Request Preview */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Payload de la requête</h3>
              <button
                onClick={() => copyToClipboard(JSON.stringify(requestPayload, null, 2))}
                className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span className="text-sm">Copier</span>
              </button>
            </div>
            <pre className="bg-black/20 p-4 rounded-lg overflow-x-auto">
              <code className="text-green-300 text-sm">
                {JSON.stringify(requestPayload, null, 2)}
              </code>
            </pre>
          </div>
        </div>

        {/* Response Panel */}
        <div className="space-y-6">
          {/* Test Cards Info */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4">Cartes de test</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <div>
                  <span className="text-white font-medium">Visa</span>
                  <code className="block text-blue-300 text-sm">4242424242424242</code>
                </div>
                <span className="text-green-400 text-sm">Succès</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <div>
                  <span className="text-white font-medium">Mastercard</span>
                  <code className="block text-blue-300 text-sm">5555555555554444</code>
                </div>
                <span className="text-green-400 text-sm">Succès</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <div>
                  <span className="text-white font-medium">Amex</span>
                  <code className="block text-blue-300 text-sm">378282246310005</code>
                </div>
                <span className="text-green-400 text-sm">Succès</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <div>
                  <span className="text-white font-medium">Test Declined</span>
                  <code className="block text-blue-300 text-sm">4000000000000002</code>
                </div>
                <span className="text-red-400 text-sm">Refusé</span>
              </div>
            </div>
          </div>

          {/* Response */}
          {showResponse && response && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-white">Réponse de l'API</h3>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="text-green-400 text-sm">200 OK</span>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(response, null, 2))}
                  className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  <span className="text-sm">Copier</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* Status Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-green-400 text-sm">Transaction ID</span>
                    </div>
                    <code className="text-white text-sm">{response.transactionId}</code>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-400 text-sm">Temps de traitement</span>
                    </div>
                    <span className="text-white text-sm">{response.debug?.processingTime}</span>
                  </div>
                </div>

                {/* Full Response */}
                <div>
                  <h4 className="text-white font-medium mb-2">Réponse complète</h4>
                  <pre className="bg-black/20 p-4 rounded-lg overflow-x-auto">
                    <code className="text-green-300 text-sm">
                      {JSON.stringify(response, null, 2)}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!showResponse && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center">
              <Code className="h-12 w-12 text-blue-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Réponse API</h3>
              <p className="text-blue-300">
                La réponse de l'API apparaîtra ici après l'envoi de votre requête
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <Settings className="h-6 w-6 text-blue-400 mt-1" />
          <div>
            <h4 className="text-white font-medium mb-2">À propos du mode Sandbox</h4>
            <p className="text-blue-300 text-sm mb-2">
              Le mode Sandbox utilise des données de test et ne traite aucune transaction réelle. 
              Toutes les réponses sont simulées et aucun frais ne sera appliqué.
            </p>
            <ul className="text-blue-300 text-sm space-y-1">
              <li>• Les numéros de carte de test ne fonctionnent que dans ce mode</li>
              <li>• Aucune donnée sensible n'est stockée ou transmise</li>
              <li>• Les réponses incluent des données de debug pour faciliter l'intégration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}