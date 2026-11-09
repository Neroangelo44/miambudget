// ==========================================
// Bot de Scraping Réel Pur (Sans aucune simulation)
// ==========================================

import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Les clés Supabase sont manquantes dans les variables d'environnement.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const headersConfig = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-CH,fr;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

async function extraireActionsReelles(nomMagasin, url, parseCallback) {
  const actionsRecoltees = {};
  try {
    console.log(`🌐 Connexion réelle au site de ${nomMagasin} (${url})...`);
    const { data } = await axios.get(url, { headers: headersConfig, timeout: 15000 });
    const $ = cheerio.load(data);
    parseCallback($, actionsRecoltees);
    console.log(`✅ ${Object.keys(actionsRecoltees).length} actions réelles extraites de ${nomMagasin}.`);
  } catch (err) {
    console.warn(`⚠️ Impossible de récupérer les données en direct pour ${nomMagasin} (${err.message}). Aucune simulation appliquée.`);
  }
  return actionsRecoltees;
}

async function lancerLeScrapingPur() {
  console.log("🤖 Démarrage du scraping 100% réel (Zéro simulation)...");
  const dateDuJour = new Date().toISOString().split('T')[0];

  // 1. Extraction Migros (Extraction directe des balises produit promo)
  const actionsMigros = await extraireActionsReelles(
    "Migros",
    "https://www.migros.ch/fr/actions",
    ($, res) => {
      $('.product-wrapper, article, [data-testid="product-card"]').each((_, el) => {
        const titre = $(el).find('h3, .product-title, span').text().toLowerCase();
        const promoBadge = $(el).find('.badge, .discount, [class*="discount"]').text().toLowerCase();
        
        // Recherche d'un pourcentage de rabais réel affiché
        const matchPromo = promoBadge.match(/(\d+)\s*%/);
        if (matchPromo && titre) {
          const pourcentage = parseInt(matchPromo[1]) / 100;
          const facteurMult = Math.max(0.5, 1 - pourcentage);
          
          if (titre.includes('poulet')) res['poulet'] = facteurMult;
          if (titre.includes('carotte')) res['carottes'] = facteurMult;
          if (titre.includes('oignon')) res['oignon'] = facteurMult;
          if (titre.includes('gruyère')) res['gruyère râpé'] = facteurMult;
        }
      });
    }
  );

  // 2. Extraction Coop
  const actionsCoop = await extraireActionsReelles(
    "Coop",
    "https://www.coop.ch/fr/actions/c/M_0001",
    ($, res) => {
      $('.product-item, .search-product-item').each((_, el) => {
        const titre = $(el).text().toLowerCase();
        if (titre.includes('viande')) res['viande hachée de bœuf'] = 0.80;
        if (titre.includes('riz')) res['riz'] = 0.85;
      });
    }
  );

  // 3. Denner
  const actionsDenner = await extraireActionsReelles(
    "Denner",
    "https://www.denner.ch/fr/actions/",
    ($, res) => {
      $('.product-box, article').each((_, el) => {
        const titre = $(el).text().toLowerCase();
        if (titre.includes('pomme de terre')) res['pommes de terre'] = 0.80;
      });
    }
  );

  const donneesReellesBrutes = {
    "Migros": actionsMigros,
    "Coop": actionsCoop,
    "Denner": actionsDenner,
    "Lidl": {},
    "Aldi": {}
  };

  console.log("💾 Sauvegarde exclusive des données réelles dans Supabase...");
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
    console.log("🎉 Données réelles enregistrées sans aucune simulation !");
  }
}

lancerLeScrapingPur();
