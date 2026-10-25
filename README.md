# MGSI Planner ? ENSIA-SD Taroudant

> **Application Full-Stack de Planification Acad?mique Intelligente & Assistant IA pour les ?tudiants Ing?nieurs en MGSI (Management et Gouvernance des Syst?mes d'Information)**
> **Universit? Ibn Zohr ? ?cole Nationale Sup?rieure de l'Intelligence Artificielle et Sciences des Donn?es (ENSIA-SD Taroudant)**

---

## 1. Vue d'ensemble du Projet

**MGSI Planner** n'est pas une simple "To-Do list" ni un simple wrapper d'interface pour ChatGPT. C'est un syst?me unifi? con?u pour r?soudre la surcharge cognitive des ?tudiants ing?nieurs en organisant de fa?on r?aliste et humaine leurs semaines d'?tudes.

L'application r?pond en continu aux trois questions vitales de l'?tudiant :
1. **Que dois-je faire ?** (Devoirs, projets, rapports, pr?parations d'examens, TD, TP).
2. **Quand dois-je le faire ?** (Calendrier intelligent sans conflit, int?grant l'emploi du temps officiel de l'?cole et le rythme de vie).
3. **Que dois-je faire maintenant ?** (Recommandation instantan?e contextuelle avec bouton *Start Now / Chrono Focus*).

---

## 2. Choix Technologiques & Architecture

L'application est architectur?e autour d'un socle unifi? et multiplateforme :

| Couche | Technologie | Justification |
|---|---|---|
| **Frontend Web (Desktop & Tablette)** | **React 18 + TypeScript + Vite + Tailwind CSS** | Rendu ultra-rapide, responsive, animations subtiles, ergonomie soign?e, support grand ?cran (vues mensuelle/hebdomadaire/journali?re). |
| **Application Mobile Android** | **Capacitor 7** | Empaquette le m?me code frontend dans un conteneur natif Android sans duplication de code. G?n?re un v?ritable fichier APK (`assembleDebug` / `assembleRelease`), g?re les notifications locales et le mode hors-ligne. |
| **Base de Donn?es SQL** | **Supabase (PostgreSQL 17)** | Sch?ma relationnel robuste, Row Level Security (RLS) garantissant l'isolation totale des donn?es de chaque ?tudiant, UUIDs, d?clencheurs et proc?dures stock?es (`PL/pgSQL`). |
| **Backend API** | **Node.js + Express + TypeScript** | Serveur d?coupl?, gestion s?curis?e des secrets, moteur de planification d?terministe, apprentissage statistique de v?locit?, notifications intelligentes. |
| **Intelligence Artificielle** | **Google Gemini API avec Function Calling (Outils)** | L'IA n'est pas un bot d?connect? : elle dispose d'outils s?rs c?t? serveur pour lire le calendrier, ajouter des devoirs, reprogrammer des sessions et planifier la semaine. |
| **Moteur d'Horloge / Focus** | **Web Audio API + Algorithme de d?compte** | Timer Pomodoro/Focus ergonomique (25, 30, 45, 60m ou sur-mesure) avec alerte sonore ind?pendante des assets externes. |

---

## 3. Emploi du Temps Officiel MGSI (Session d'Automne 2026-2027)

L'application int?gre nativement l'emploi du temps officiel de l'ENSIA-SD extrait du document `emploi.pdf` :

### Directives Officielles :
- **D?but des Cours (CM)** : 07/09/2026 pour le Semestre S3 (Deuxi?me Ann?e).
- **D?but des Travaux Dirig?s (TD)** : 14/09/2026.
- **D?but des Travaux Pratiques (TP)** : 21/09/2026.
- **Horaires Sp?ciaux Vendredi Apr?s-midi** :
  - **S?ance 1** : 15h00 ? 16h45
  - **S?ance 2** : 17h00 ? 18h45

### Modules du Semestre 3 int?gr?s :
- **M231_1** : Langue française (Pr. Mohamed EL OUARDI – Amphi 3)
- **M231_2** : Langue Anglaise (Pr. Mohamed HIKAL – Amphi 3)
- **M232** : Gestion de projet et Génie logiciel (Pr. RASSAM LATIFA – Amphi 1 / Salle 10 / Salle 4 INFO)
- **M233** : Administration des Bases de donn?es Avanc?es (Pr. LAASSAM BRAHIM ? Salle 10 / Salle 2 INFO)
- **M234** : Progiciels de gestion int?gr?e ERP (Pr. SAAD BASMA ? Salle 12 / Salle 3 INFO)
- **M235** : Audit des SI (Pr. EL-ATEIF SARA ? Salle 10 / Salle 2 INFO)
- **M236** : Syst?mes d'Information Distribu?s (Pr. BOUJERFAOUI SAID ? Salle 6 / Salle 3 INFO)
- **M237_1** : Transformation Digitale (Pr. EL BICHRI Fadila ? Amphi 1)

---

## 4. Moteur de Planification D?terministe & Psychologie de l'?tudiant

Le planificateur ne se contente pas de demander ? un LLM d'inventer des heures. Il utilise la classe **`SchedulingEngine`** :

1. **Fractionnement Intelligent des Grandes T?ches** :
   - Un projet de 4h n'est *jamais* planifi? d'un coup.
   - Il est scind? en sous-sessions de 30 ? 60 minutes r?parties sur plusieurs jours avec des phases p?dagogiques :
     - *Phase 1 : Compr?hension du sujet & Sp?cifications*
     - *Phase 2 : Recherche pr?liminaire & Architecture*
     - *Phase 3 : D?marrage de la mise en ?uvre*
     - *Phase 4 : D?veloppement des fonctionnalit?s cl?s*
     - *Phase 5 : Revue & Finitions*
2. **Protection Sanctuaris?e du Rythme de Vie** :
   - Exclusion stricte des heures de sommeil (ex: 23h30 ? 07h00).
   - Exclusion des pauses repas (D?jeuner 12h15 ? 14h30, D?ner 19h30 ? 20h30).
   - Tampon de transition/trajet de 10 ? 15 min apr?s chaque cours.
3. **Pr?vention de l'?puisement (Fatigue Limit)** :
   - Limite quotidienne maximale de travail personnel (d?faut : 4h/jour).
   - Pauses obligatoires de 15 min ins?r?es entre deux s?ances cons?cutives.
4. **Apprentissage Statistique de V?locit? (`LearningEngine`)** :
   - Compare le temps estim? au temps r?el mesur? par le Chrono.
   - Ajuste le ratio de v?locit? par mati?re et par type de devoir (moyenne mobile exponentielle).
5. **Replanification Automatique en cas d'Impr?vu** :
   - Si une s?ance de 45 min n'est r?alis?e qu'? hauteur de 20 min, le reste (25 min) est automatiquement repositionn? sur le cr?neau libre suivant le plus appropri?.

---

## 5. Outils IA (Gemini Function Calling)

Le copilote IA dispose des fonctions backend suivantes :

| Nom de l'Outil | Description | Param?tres |
|---|---|---|
| `read_calendar` | Lit les cours et s?ances sur une p?riode | `startDate`, `endDate` |
| `read_tasks` | Lit les devoirs et projets en attente | `status` (todo, in_progress, completed, all) |
| `read_exams` | Lit la liste des examens et contr?les | Aucun |
| `get_free_slots` | Calcule les cr?neaux libres r?els d'une journ?e | `date` (YYYY-MM-DD) |
| `create_task` | Cr?e un devoir dans la base de donn?es | `title`, `subjectCode`, `deadline`, `estimatedDurationMinutes`, `priority`, `difficulty` |
| `mark_task_completed` | Valide l'accomplissement d'un devoir | `taskId` ou `taskTitle` |
| `delete_task` | Supprime une t?che | `taskId` |
| `create_calendar_event` | Ajoute un ?v?nement ou s?ance au calendrier | `title`, `startTime`, `endTime`, `eventType` |
| `delete_calendar_event` | Supprime une s?ance du calendrier | `eventId` |
| `organize_schedule` | D?clenche l'ordonnancement complet de la semaine | `daysAhead` (d?faut: 7) |
| `reschedule_incomplete_session` | Replanifie le reliquat d'une session non finie | `taskId`, `remainingMinutes` |

---

## 6. Installation & D?marrage Rapide

### Pr?requis :
- Node.js v18+ (test? sur Node v24)
- Java 17 LTS (pour le build Android)
- Android SDK (d?fini dans `ANDROID_HOME`)

### 1. Cloner et Installer les D?pendances :
```bash
# Installation backend
npm install --prefix backend

# Installation frontend
npm install --prefix frontend
```

### 2. Configuration des Variables d'Environnement :
Les fichiers `.env` sont d?j? configur?s pour pointer sur l'instance Supabase de l'ENSIA-SD.
Pour ajouter votre cl? Gemini optionnelle :
Dans `backend/.env` :
```env
GEMINI_API_KEY=votre_cle_gemini_ici
```
*(Si aucune cl? n'est renseign?e, le syst?me active automatiquement son moteur de r?gles intelligentes sans crash)*.

### 3. Lancer les Tests du Moteur de Planification :
```bash
npm run test:backend
```

### 4. D?marrer en D?veloppement :
```bash
# Terminal 1 : Backend API (port 5000)
npm run dev:backend

# Terminal 2 : Frontend Vite (port 5173)
npm run dev:frontend
```
Ouvrez votre navigateur sur `http://localhost:5173`.
Cliquez sur le bouton **"Acc?s D?mo 1-Clic"** pour charger instantan?ment les cours de MGSI S3, les examens et les devoirs pr?-remplis !

---

## 7. G?n?ration de l'APK Android

L'application Android est configur?e avec **Capacitor 7** dans le dossier `frontend/android`.

### ?tapes pour g?n?rer l'APK :
```bash
# 1. Compiler le frontend pour la production
npm run build:frontend

# 2. Synchroniser les assets web avec le projet Android
npm run android:sync

# 3. Compiler l'APK Debug avec Gradle
npm run android:build
```

L'APK g?n?r? se trouvera dans :
`frontend/android/app/build/outputs/apk/debug/app-debug.apk`

Vous pouvez aussi ouvrir directement le projet dans Android Studio :
```bash
cd frontend
npx cap open android
```

---

## 8. Structure du Code Source

```
MGSI/
??? backend/
?   ??? src/
?   ?   ??? ai/
?   ?   ?   ??? gemini.ts           # Service Gemini & boucle de tool-calling
?   ?   ?   ??? tools.ts            # D?clarations et ex?cuteurs des 11 outils
?   ?   ??? config/
?   ?   ?   ??? env.ts              # Variables d'environnement
?   ?   ?   ??? supabase.ts         # Client Supabase
?   ?   ??? notifications/
?   ?   ?   ??? smartNotifications.ts # ?valuateur d'alertes contextuelles
?   ?   ??? routes/
?   ?   ?   ??? ai.ts               # Endpoint chat IA
?   ?   ?   ??? auth.ts             # Auth & profil ?tudiant
?   ?   ?   ??? exams.ts            # Examens & plan de r?vision
?   ?   ?   ??? focus.ts            # Enregistrement Chrono & report
?   ?   ?   ??? notifications.ts    # Notifications
?   ?   ?   ??? schedule.ts         # Calendrier & organize_schedule
?   ?   ?   ??? stats.ts            # M?triques tableau de bord
?   ?   ?   ??? tasks.ts            # CRUD devoirs & split-preview
?   ?   ??? scheduling/
?   ?   ?   ??? engine.ts           # Moteur d?terministe de planification
?   ?   ?   ??? learning.ts         # Apprentissage statistique de v?locit?
?   ?   ??? tests/
?   ?   ?   ??? scheduling.test.ts  # Suite de tests Vitest (4/4 pass?s)
?   ?   ??? types/
?   ?   ?   ??? index.ts            # Mod?les de donn?es TypeScript
?   ?   ??? index.ts                # Point d'entr?e Express
?   ??? package.json
?
??? frontend/
?   ??? android/                    # Projet Android natif (Gradle)
?   ??? src/
?   ?   ??? components/
?   ?   ?   ??? BottomNav.tsx       # Barre de navigation mobile
?   ?   ?   ??? ChronoModal.tsx     # Chronom?tre Focus ("Do It Now")
?   ?   ?   ??? Navbar.tsx          # En-t?te avec switch G1/G2 & alertes
?   ?   ?   ??? NotificationModal.tsx # Centre de notifications
?   ?   ?   ??? Sidebar.tsx         # Navigation lat?rale desktop
?   ?   ?   ??? TaskModal.tsx       # Cr?ation de devoir avec split preview
?   ?   ??? context/
?   ?   ?   ??? AuthContext.tsx     # ?tat d'authentification & profil
?   ?   ??? lib/
?   ?   ?   ??? api.ts              # Client API REST
?   ?   ?   ??? supabase.ts         # Client Supabase
?   ?   ??? pages/
?   ?   ?   ??? AIAssistantPage.tsx # Chat IA avec inspection des outils
?   ?   ?   ??? AuthPage.tsx        # ?cran de connexion & d?mo 1-clic
?   ?   ?   ??? CalendarPage.tsx    # Vues Jour / Semaine / Mois
?   ?   ?   ??? DashboardPage.tsx   # Tableau de bord "Que faire maintenant"
?   ?   ?   ??? ExamsPage.tsx       # Gestion des examens & r?vision progressive
?   ?   ?   ??? ProfilePage.tsx     # Configuration rythme & contraintes
?   ?   ?   ??? TasksPage.tsx       # Suivi des t?ches & devoirs
?   ?   ?   ??? TimetablePage.tsx   # Emploi officiel ENSIA-SD (emploi.pdf)
?   ?   ??? types/
?   ?   ?   ??? index.ts
?   ?   ??? App.tsx
?   ?   ??? main.tsx
?   ?   ??? index.css
?   ??? capacitor.config.ts
?   ??? tailwind.config.js
?   ??? vite.config.ts
?   ??? package.json
?
??? emploi.pdf                      # Document officiel source ENSIA-SD
??? package.json                    # Scripts racines unifi?s
```
