# MGSI Planner – ENSIA-SD Taroudant

> **Application Full-Stack de Planification Académique Intelligente & Assistant IA pour les Étudiants Ingénieurs en MGSI (Management et Gouvernance des Systèmes d'Information)**  
> **Université Ibn Zohr – École Nationale Supérieure de l'Intelligence Artificielle et Sciences des Données (ENSIA-SD Taroudant)**

---

## 1. Vue d'ensemble du Projet

**MGSI Planner** n'est pas une simple "To-Do list" ni un simple wrapper d'interface pour ChatGPT. C'est un système unifié conçu pour résoudre la surcharge cognitive des étudiants ingénieurs en organisant de façon réaliste et humaine leurs semaines d'études.

L'application répond en continu aux trois questions vitales de l'étudiant :
1. **Que dois-je faire ?** (Devoirs, projets, rapports, préparations d'examens, TD, TP).
2. **Quand dois-je le faire ?** (Calendrier intelligent sans conflit, intégrant l'emploi du temps officiel de l'école et le rythme de vie).
3. **Que dois-je faire maintenant ?** (Recommandation instantanée contextuelle avec bouton *Start Now / Chrono Focus*).

---

## 2. Choix Technologiques & Architecture

L'application est architecturée autour d'un socle unifié et multiplateforme :

| Couche | Technologie | Justification |
|---|---|---|
| **Frontend Web (Desktop & Tablette)** | **React 18 + TypeScript + Vite + Tailwind CSS** | Rendu ultra-rapide, responsive, animations subtiles, ergonomie soignée, support grand écran (vues mensuelle/hebdomadaire/journalière). |
| **Application Mobile Android** | **Capacitor 7** | Empaquette le même code frontend dans un conteneur natif Android sans duplication de code. Génère un véritable fichier APK (`assembleDebug` / `assembleRelease`), gère les notifications locales et le mode hors-ligne. |
| **Base de Données SQL** | **Supabase (PostgreSQL 17)** | Schéma relationnel robuste, Row Level Security (RLS) garantissant l'isolation totale des données de chaque étudiant, UUIDs, déclencheurs et procédures stockées (`PL/pgSQL`). |
| **Backend API** | **Node.js + Express + TypeScript** | Serveur découplé, gestion sécurisée des secrets, moteur de planification déterministe, apprentissage statistique de vélocité, notifications intelligentes. |
| **Intelligence Artificielle** | **Google Gemini API avec Function Calling (Outils)** | L'IA n'est pas un bot déconnecté : elle dispose d'outils sûrs côté serveur pour lire le calendrier, ajouter des devoirs, reprogrammer des sessions et planifier la semaine. |
| **Moteur d'Horloge / Focus** | **Web Audio API + Algorithme de décompte** | Timer Pomodoro/Focus ergonomique (25, 30, 45, 60 min ou sur-mesure) avec alerte sonore indépendante des assets externes. |

---

## 3. Emploi du Temps Officiel MGSI (Session d'Automne)

L'application intègre nativement l'emploi du temps officiel de l'ENSIA-SD extrait du document `MGSI S3.pdf` :

### Directives Officielles :
- **Début des Cours (CM)** : Semestre S3 (Deuxième Année).
- **Début des Travaux Dirigés (TD)**
- **Début des Travaux Pratiques (TP)**
- **Horaires Spéciaux Vendredi Après-midi** :
  - **Séance 1** : 15h00 à 16h45
  - **Séance 2** : 17h00 à 18h45

### Modules du Semestre 3 intégrés :
- **M231_1** : Langue française (Pr. Mohamed EL OUARDI – Amphi 3)
- **M231_2** : Langue Anglaise (Pr. Mohamed HIKAL – Amphi 3)
- **M232** : Gestion de projet et Génie logiciel (Pr. RASSAM LATIFA – Amphi 1 / Salle 10 / Salle 4 INFO)
- **M233** : Administration des Bases de données Avancées (Pr. LAASSAM BRAHIM – Salle 10 / Salle 2 INFO)
- **M234** : Progiciels de gestion intégrée ERP (Pr. SAAD BASMA – Salle 12 / Salle 3 INFO)
- **M235** : Audit des SI (Pr. EL-ATEIF SARA – Salle 10 / Salle 2 INFO)
- **M236** : Systèmes d'Information Distribués (Pr. BOUJERFAOUI SAID – Salle 6 / Salle 3 INFO)
- **M237_1** : Transformation Digitale (Pr. EL BICHRI Fadila – Amphi 1)

---

## 4. Moteur de Planification Déterministe & Psychologie de l'Étudiant

Le planificateur ne se contente pas de demander à un LLM d'inventer des heures. Il utilise la classe **`SchedulingEngine`** :

1. **Fractionnement Intelligent des Grandes Tâches** :
   - Un projet de 4h n'est *jamais* planifié d'un coup.
   - Il est scindé en sous-sessions de 30 à 60 minutes réparties sur plusieurs jours avec des phases pédagogiques :
     - *Phase 1 : Compréhension du sujet & Spécifications*
     - *Phase 2 : Recherche préliminaire & Architecture*
     - *Phase 3 : Démarrage de la mise en œuvre*
     - *Phase 4 : Développement des fonctionnalités clés*
     - *Phase 5 : Revue & Finitions*
2. **Protection Sanctuarisée du Rythme de Vie** :
   - Exclusion stricte des heures de sommeil (ex: 23h30 à 07h00).
   - Exclusion des pauses repas (Déjeuner 12h15 à 14h30, Dîner 19h30 à 20h30).
   - Tampon de transition/trajet de 10 à 15 min après chaque cours.
3. **Prévention de l'Épuisement (Fatigue Limit)** :
   - Limite quotidienne maximale de travail personnel (défaut : 4h/jour).
   - Pauses obligatoires de 15 min insérées entre deux séances consécutives.
4. **Apprentissage Statistique de Vélocité (`LearningEngine`)** :
   - Compare le temps estimé au temps réel mesuré par le Chrono.
   - Ajuste le ratio de vélocité par matière et par type de devoir (moyenne mobile exponentielle).
5. **Replanification Automatique en cas d'Imprévu** :
   - Si une séance de 45 min n'est réalisée qu'à hauteur de 20 min, le reste (25 min) est automatiquement repositionné sur le créneau libre suivant le plus approprié.

---

## 5. Outils IA (Gemini Function Calling)

Le copilote IA dispose des fonctions backend suivantes :

| Nom de l'Outil | Description | Paramètres |
|---|---|---|
| `read_calendar` | Lit les cours et séances sur une période | `startDate`, `endDate` |
| `read_tasks` | Lit les devoirs et projets en attente | `status` (todo, in_progress, completed, all) |
| `read_exams` | Lit la liste des examens et contrôles | Aucun |
| `get_free_slots` | Calcule les créneaux libres réels d'une journée | `date` (YYYY-MM-DD) |
| `create_task` | Crée un devoir dans la base de données | `title`, `subjectCode`, `deadline`, `estimatedDurationMinutes`, `priority`, `difficulty` |
| `mark_task_completed` | Valide l'accomplissement d'un devoir | `taskId` ou `taskTitle` |
| `delete_task` | Supprime une tâche | `taskId` |
| `create_calendar_event` | Ajoute un événement ou séance au calendrier | `title`, `startTime`, `endTime`, `eventType` |
| `delete_calendar_event` | Supprime une séance du calendrier | `eventId` |
| `organize_schedule` | Déclenche l'ordonnancement complet de la semaine | `daysAhead` (défaut: 7) |
| `reschedule_incomplete_session` | Replanifie le reliquat d'une session non finie | `taskId`, `remainingMinutes` |

---

## 6. Installation & Démarrage Rapide

### Prérequis :
- Node.js v18+ (testé sur Node v24)
- Java 17 LTS (pour le build Android)
- Android SDK (défini dans `ANDROID_HOME`)

### 1. Cloner et Installer les Dépendances :
```bash
# Cloner le dépôt
git clone https://github.com/zakaria1n/mgsi.git
cd mgsi

# Installation backend
npm install --prefix backend

# Installation frontend
npm install --prefix frontend
```

### 2. Configuration des Variables d'Environnement :
Copiez les fichiers d'exemple `.env.example` vers `.env` dans chaque dossier :

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Puis renseignez vos identifiants Supabase et clés API :
- `backend/.env` : `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, et `GEMINI_API_KEY` (optionnelle).
- `frontend/.env` : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

*(Si aucune clé Gemini n'est renseignée, le système active automatiquement son moteur de règles déterministe en repli)*.

### 3. Lancer les Tests du Moteur de Planification :
```bash
npm run test:backend
```

### 4. Démarrer en Développement :
```bash
# Terminal 1 : Backend API (port 5000)
npm run dev:backend

# Terminal 2 : Frontend Vite (port 5173)
npm run dev:frontend
```
Ouvrez votre navigateur sur `http://localhost:5173`.
Cliquez sur le bouton **"Accès Démo 1-Clic"** pour charger instantanément les cours de MGSI S3, les examens et les devoirs pré-remplis !

---

## 7. Génération de l'APK Android

L'application Android est configurée avec **Capacitor 7** dans le dossier `frontend/android`.

### Étapes pour générer l'APK :
```bash
# 1. Compiler le frontend pour la production
npm run build:frontend

# 2. Synchroniser les assets web avec le projet Android
npm run android:sync

# 3. Compiler l'APK Debug avec Gradle
npm run android:build
```

L'APK généré se trouvera dans :
`frontend/android/app/build/outputs/apk/debug/app-debug.apk`

Vous pouvez aussi ouvrir directement le projet dans Android Studio :
```bash
cd frontend
npx cap open android
```

---

## 8. Structure du Code Source

```text
MGSI/
├── backend/
│   ├── src/
│   │   ├── ai/
│   │   │   ├── gemini.ts             # Service Gemini & boucle de tool-calling
│   │   │   └── tools.ts              # Déclarations et exécuteurs des 11 outils
│   │   ├── config/
│   │   │   ├── env.ts                # Variables d'environnement
│   │   │   └── supabase.ts           # Client Supabase
│   │   ├── notifications/
│   │   │   └── smartNotifications.ts # Évaluateur d'alertes contextuelles
│   │   ├── routes/
│   │   │   ├── ai.ts                 # Endpoint chat IA
│   │   │   ├── auth.ts               # Auth & profil étudiant
│   │   │   ├── exams.ts              # Examens & plan de révision
│   │   │   ├── focus.ts              # Enregistrement Chrono & report
│   │   │   ├── notifications.ts      # Notifications
│   │   │   ├── schedule.ts           # Calendrier & organize_schedule
│   │   │   ├── stats.ts              # Métriques tableau de bord
│   │   │   └── tasks.ts              # CRUD devoirs & split-preview
│   │   ├── scheduling/
│   │   │   ├── engine.ts             # Moteur déterministe de planification
│   │   │   └── learning.ts           # Apprentissage statistique de vélocité
│   │   ├── tests/
│   │   │   └── scheduling.test.ts    # Suite de tests Vitest (4/4 passés)
│   │   ├── types/
│   │   │   └── index.ts              # Modèles de données TypeScript
│   │   └── index.ts                  # Point d'entrée Express
│   └── package.json
│
├── frontend/
│   ├── android/                      # Projet Android natif (Gradle)
│   ├── src/
│   │   ├── components/
│   │   │   ├── BottomNav.tsx         # Barre de navigation mobile
│   │   │   ├── ChronoModal.tsx       # Chronomètre Focus ("Do It Now")
│   │   │   ├── Navbar.tsx            # En-tête avec switch G1/G2 & alertes
│   │   │   ├── NotificationModal.tsx # Centre de notifications
│   │   │   ├── Sidebar.tsx           # Navigation latérale desktop
│   │   │   └── TaskModal.tsx         # Création de devoir avec split preview
│   │   ├── context/
│   │   │   ├── AuthContext.tsx       # État d'authentification & profil
│   │   │   └── DialogContext.tsx
│   │   ├── lib/
│   │   │   ├── api.ts                # Client API REST
│   │   │   └── supabase.ts           # Client Supabase
│   │   ├── pages/
│   │   │   ├── AIAssistantPage.tsx   # Chat IA avec inspection des outils
│   │   │   ├── AuthPage.tsx          # Écran de connexion & démo 1-clic
│   │   │   ├── CalendarPage.tsx      # Vues Jour / Semaine / Mois
│   │   │   ├── DashboardPage.tsx     # Tableau de bord "Que faire maintenant"
│   │   │   ├── ExamsPage.tsx         # Gestion des examens & révision progressive
│   │   │   ├── ProfilePage.tsx       # Configuration rythme & contraintes
│   │   │   ├── TasksPage.tsx         # Suivi des tâches & devoirs
│   │   │   └── TimetablePage.tsx     # Emploi officiel ENSIA-SD (MGSI S3.pdf)
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── capacitor.config.ts
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── MGSI S3.pdf                       # Document officiel source ENSIA-SD
└── package.json                      # Scripts racines unifiés
```
