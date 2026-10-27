// =====================================================================
// Exo 1 : Notre première API
//   API REST Node.js + Express qui gère des produits (nom, description,
//   prix, catégorie) : lister, consulter, ajouter, modifier, remplacer,
//   supprimer. Méthodes HTTP adaptées, JSON, codes de statut adaptés.
//
// Exo 2 : Authentification par jeton
//   Point d'entrée d'authentification qui retourne un jeton d'accès,
//   actions d'écriture réservées aux utilisateurs authentifiés,
//   jetons valables 5 minutes.
// =====================================================================

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const app = express();
const port = 5050;
// Exo 1 - Contrainte : échanger les données au format JSON
app.use(express.json());

// ---------------------------------------------------------------------
// Exo 2 - Configuration des jetons
// ---------------------------------------------------------------------

// Clé de signature des jetons (aléatoire à chaque démarrage si non fournie)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
// Exo 2 - Contrainte : les jetons expirent après 5 minutes
const TOKEN_DURATION = 5 * 60; // 5 minutes, en secondes

// Utilisateurs autorisés
const users = [
  { id: 1, username: 'admin', password: 'admin123' }
];

// ---------------------------------------------------------------------
// Exo 1 - Données : un produit = nom, description, prix, catégorie
// ---------------------------------------------------------------------
let products = [
  {
    id: 1,
    nom: 'BMW Série 1',
    description: 'Compacte 5 portes, 118i 136 ch',
    prix: 34900,
    categorie: 'Compacte'
  },
  {
    id: 2,
    nom: 'BMW Série 3',
    description: 'Berline 320d 190 ch, boîte automatique',
    prix: 49900,
    categorie: 'Berline'
  },
  {
    id: 3,
    nom: 'BMW X3',
    description: 'SUV familial xDrive20d 197 ch',
    prix: 62500,
    categorie: 'SUV'
  },
  {
    id: 4,
    nom: 'BMW X5',
    description: 'Grand SUV xDrive50e hybride rechargeable',
    prix: 99900,
    categorie: 'SUV'
  },
  {
    id: 5,
    nom: 'BMW M4 Competition',
    description: 'Coupé sportif 6 cylindres, 530 ch',
    prix: 105000,
    categorie: 'Sportive'
  }
];
let nextId = 6;

// Exo 1 - Contrainte : codes de statut adaptés (400 si données invalides)
// Vérifie les champs d'un produit. partial = true pour PATCH (champs optionnels)
function validateProduct(body, partial = false) {
  const errors = [];
  const { nom, description, prix, categorie } = body || {};
  if (!partial || nom !== undefined) {
    if (typeof nom !== 'string' || nom.trim() === '') errors.push('nom est requis (texte)');
  }
  if (!partial || description !== undefined) {
    if (typeof description !== 'string') errors.push('description est requise (texte)');
  }
  if (!partial || prix !== undefined) {
    if (typeof prix !== 'number' || prix < 0) errors.push('prix est requis (nombre positif)');
  }
  if (!partial || categorie !== undefined) {
    if (typeof categorie !== 'string' || categorie.trim() === '') errors.push('categorie est requise (texte)');
  }
  return errors;
}

// ---------------------------------------------------------------------
// Exo 2 - Étape 3 : limiter les actions d'écriture aux utilisateurs authentifiés
//   Contrainte : un jeton valide est nécessaire pour chaque requête protégée
//   -> 401 si jeton absent, invalide ou expiré
// ---------------------------------------------------------------------
// Vérifie le jeton envoyé dans l'en-tête Authorization: Bearer <jeton>
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    res.set('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ message: 'Token required' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ message });
  }
}

// ---------------------------------------------------------------------
// Exo 2 - Étape 1 : point d'entrée d'authentification
// Exo 2 - Étape 2 : générer et retourner un jeton d'accès
//   200 si connexion réussie, 400 si champs manquants, 401 si identifiants faux
// ---------------------------------------------------------------------
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'username and password are required' });
  }
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_DURATION });
  res.status(200).json({ token, tokenType: 'Bearer', expiresIn: TOKEN_DURATION });
});

// Page HTML pour tester l'API dans le navigateur
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------------------------------------------------------------------
// Exo 1 - Routes CRUD des produits
//   Lecture (GET) : libre
//   Écriture (POST, PUT, PATCH, DELETE) : protégée par authenticate (Exo 2)
// ---------------------------------------------------------------------

// Exo 1 - Lister : GET /products -> 200
app.get('/products', (req, res) => {
  res.status(200).json(products);
});

// Exo 1 - Consulter : GET /products/:id -> 200, ou 404 si introuvable
app.get('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.status(200).json(product);
});

// Exo 1 - Ajouter : POST /products -> 201, 400 si invalide
// Exo 2 - Protégé : jeton requis (401 sinon)
app.post('/products', authenticate, (req, res) => {
  const errors = validateProduct(req.body);
  if (errors.length) {
    return res.status(400).json({ message: 'Invalid data', errors });
  }
  const { nom, description, prix, categorie } = req.body;
  const newProduct = { id: nextId++, nom, description, prix, categorie };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// Exo 1 - Remplacer : PUT /products/:id (produit complet) -> 200, 400, 404
// Exo 2 - Protégé : jeton requis (401 sinon)
app.put('/products/:id', authenticate, (req, res) => {
  const id = parseInt(req.params.id);
  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }
  const errors = validateProduct(req.body);
  if (errors.length) {
    return res.status(400).json({ message: 'Invalid data', errors });
  }
  const { nom, description, prix, categorie } = req.body;
  products[productIndex] = { id, nom, description, prix, categorie };
  res.status(200).json(products[productIndex]);
});

// Exo 1 - Modifier : PATCH /products/:id (seulement les champs envoyés) -> 200, 400, 404
// Exo 2 - Protégé : jeton requis (401 sinon)
app.patch('/products/:id', authenticate, (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  const errors = validateProduct(req.body, true);
  if (errors.length) {
    return res.status(400).json({ message: 'Invalid data', errors });
  }
  const { nom, description, prix, categorie } = req.body;
  if (nom !== undefined) product.nom = nom;
  if (description !== undefined) product.description = description;
  if (prix !== undefined) product.prix = prix;
  if (categorie !== undefined) product.categorie = categorie;
  res.status(200).json(product);
});

// Exo 1 - Supprimer : DELETE /products/:id -> 204, ou 404 si introuvable
// Exo 2 - Protégé : jeton requis (401 sinon)
app.delete('/products/:id', authenticate, (req, res) => {
  const id = parseInt(req.params.id);
  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }
  products.splice(productIndex, 1);
  res.status(204).send();
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
