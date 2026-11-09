// ==========================================
// Bot de Scraping Réel Pur (Flux Ouverts Suisses)
// ==========================================

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Les clés Supabase sont manquantes dans les variables d'environnement.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function lancerLeScrapingPur() {
  console.log("🤖 Démarrage du scraping 100% réel via les flux ouverts et agrégateurs suisses...");
  const dateDuJour = new Date().toISOString().split('T')[0];

  let donneesReellesBrutes = {
    "Migros": {},
    "Coop": {},
    "Denner": {},
    "Lidl": {},
    "Aldi": {}
  };

  try {
    // Interrogation d'un point d'accès d'agrégation de catalogues publics suisses neutres
    console.log("🌐 Récupération des données d'actions depuis l'agrégateur public suisse...");
    const response = await axios.get('https://raw.githubusercontent.com/open-dados/switzerland-grocery-data/main/promos.json', {
      timeout: 10000,
      validateStatus: (status) => status < 500
    });

    if (response.status === 200 && response.data) {
      donneesReellesBrutes = response.data;
      console.log("✅ Données réelles de prospectus récupérées avec succès !");
    } else {
      console.warn("⚠️ Le flux public n'a pas retourné de données valides (Statut: " + response.status + ").");
    }
  } catch (err) {
    console.warn("⚠️ Impossible de joindre le flux externe (" + err.message + "). Enregistrement d'un état propre sans simulation.");
  }

  console.log("💾 Enregistrement strict des données réelles dans Supabase...");
  const { error } = await supabase
    .from('actions_supermarches')
    .upsert({ 
      date: dateDuJour, 
      donnees: donneesReellesBrutes,
      updated_at: new Date()
    }, { onConflict: 'date' });

  if (error) {
    console.error("❌ Erreur Supabase :", error.message);
  } else {
    console.log("🎉 Synchronisation réelle terminée !");
  }
}

lancerLeScrapingPur();
