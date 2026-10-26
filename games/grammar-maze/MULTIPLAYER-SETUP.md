# Grammar Maze multiplayer setup

The maze still works alone with no setup. Multiplayer stays on the message **Multiplayer not set up yet** until the steps below are done. The free Firebase Spark plan is enough for a class (about 40 phones at once; the free limit is 100 connections).

Only a nickname is stored. There is no last name, email, or student account. Rooms stop accepting answers 8 hours after they are created. The teacher can delete a room sooner with **End room**.

The web config you paste is public. It is not a password. Do not download a service-account JSON, and do not put one in this folder.

## English

1. Open [https://console.firebase.google.com](https://console.firebase.google.com) and sign in with a Google account.
2. Click **Add project**. Name it something like `englishia-maze`. Turn **off** Google Analytics. This game should not collect student analytics. Create the project.
3. In the left menu open **Build → Realtime Database → Create Database**.
   - Location: **Belgium (europe-west1)**.
   - Start in **locked mode**.
4. Still in Realtime Database, open the **Rules** tab. Select everything in the editor and replace it with the full contents of `games/grammar-maze/database.rules.json` (the file starts with `{` and the key `"rules"`). Click **Publish**.
5. Open **Build → Authentication → Sign-in method**. Open **Anonymous** and click **Enable**, then **Save**.
6. Open **Authentication → Settings → Authorized domains**. Click **Add domain** and add `amirk390.github.io`. `localhost` is already on the list; leave it.
7. Open the gear **Project settings**. Under **Your apps**, click the web icon `</>`. Register the app as `Grammar Maze`. Do not turn on Firebase Hosting. Register the app.
8. Copy the `firebaseConfig` values into `games/grammar-maze/firebase-config.js`, replacing every `YOUR_...` placeholder. Use the `databaseURL` Firebase shows. For Belgium it looks like `https://englishia-maze-default-rtdb.europe-west1.firebasedatabase.app`. If `databaseURL` is missing, the Realtime Database from step 3 is not created yet. Create it, then copy the config again.
9. The live game reads this file from GitHub. Send the filled-in `firebase-config.js` to your assistant, or commit it on the `main` branch of `Amirk390/Games` and push. GitHub Pages will publish it on the next build.
10. Open the game, tap **Multiplayer / משחק מרובה משתתפים**, then **Create room**. The big 4-letter code, the link, and the QR code are what students use. Students enter a first name only. You press **Start**. **End room** deletes the room.

If **Create room** says sign-in is not turned on, repeat step 5. If it says the rules blocked it, repeat step 4 and check that `databaseURL` is the database you published the rules to.

## עברית

המבוך לבד עובד גם בלי ההגדרה הזאת. כל עוד לא מסיימים את השלבים, הכפתור מציג **Multiplayer not set up yet**. התוכנית החינמית של Firebase (Spark) מספיקה לכיתה (בערך 40 טלפונים יחד; המגבלה החינמית היא 100 חיבורים).

נשמר רק שם פרטי או כינוי. אין שם משפחה, אין אימייל, ואין חשבון לתלמיד. חדר מפסיק לקבל תשובות 8 שעות אחרי שנפתח. המורה יכול למחוק אותו קודם עם **End room / סיום החדר**.

ההגדרות שמדביקים הן ציבוריות. זו לא סיסמה. לא מורידים קובץ מפתח (service account) ולא שמים קובץ כזה בתיקייה.

1. נכנסים ל-[https://console.firebase.google.com](https://console.firebase.google.com) עם חשבון גוגל.
2. לוחצים **Add project / הוספת פרויקט**. שם, למשל `englishia-maze`. מכבים את Google Analytics. אין צורך בסטטיסטיקה על תלמידים. יוצרים את הפרויקט.
3. בתפריט: **Build → Realtime Database → Create Database**.
   - מיקום: **Belgium (europe-west1)** — בלגיה.
   - מתחילים ב-**locked mode** (מצב נעול).
4. באותו מסך, לשונית **Rules**. מוחקים את מה שיש, ומדביקים את כל התוכן של הקובץ `games/grammar-maze/database.rules.json` (הקובץ מתחיל ב-`{` ויש בו `"rules"`). לוחצים **Publish**.
5. **Build → Authentication → Sign-in method**. פותחים **Anonymous** ולוחצים **Enable**, ואז **Save**.
6. **Authentication → Settings → Authorized domains**. **Add domain** ומוסיפים `amirk390.github.io`. את `localhost` לא מוחקים.
7. גלגל השיניים **Project settings**. תחת **Your apps** לוחצים על אייקון הרשת `</>`. רושמים אפליקציה בשם `Grammar Maze`. לא מפעילים Firebase Hosting.
8. מעתיקים את ערכי `firebaseConfig` אל `games/grammar-maze/firebase-config.js` במקום כל `YOUR_...`. את `databaseURL` מעתיקים כמו שהוא. בבלגיה הוא נראה כך: `https://englishia-maze-default-rtdb.europe-west1.firebasedatabase.app`. אם אין `databaseURL`, מסד הנתונים משלב 3 עוד לא נוצר. יוצרים אותו ומעתיקים שוב.
9. המשחק באתר קורא את הקובץ מגיטהאב. שולחים את `firebase-config.js` המלא לעוזר, או שומרים אותו בענף `main` של `Amirk390/Games` ודוחפים. GitHub Pages יעלה אותו בבנייה הבאה.
10. פותחים את המשחק, לוחצים **Multiplayer / משחק מרובה משתתפים**, ואז **Create room**. מופיעים קוד בן 4 אותיות, קישור, וקוד QR. התלמידים מכניסים שם פרטי בלבד. המורה לוחץ **Start**. **End room** מוחק את החדר.

אם **Create room** אומר שההתחברות לא הופעלה, חוזרים לשלב 5. אם כתוב שהכללים חסמו את הפעולה, חוזרים לשלב 4 ובודקים ש-`databaseURL` שייך לאותו מסד נתונים.
