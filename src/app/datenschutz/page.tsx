import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Datenschutz | TimetableX",
  description: "Datenschutzerklärung von TimetableX.",
};

export default function DatenschutzPage() {
  return (
    <LegalDocument title="Datenschutzerklärung" subtitle="Stand: 11.11.2026">
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          Jonathan Soppa
          <br />
          Telemannstraße 9
          <br />
          04317 Leipzig
          <br />
          Deutschland
        </p>
        <p>
          E-Mail:{" "}
          <a href="mailto:support@timetablex.space">support@timetablex.space</a>
        </p>
      </section>

      <section>
        <h2>2. Allgemeine Informationen</h2>
        <p>
          Der Schutz Ihrer personenbezogenen Daten ist mir wichtig. Diese Website kann
          grundsätzlich ohne Registrierung genutzt werden.
        </p>
        <p>
          Für die Webanalyse wird ein Cookie-Banner eingesetzt. Analyse-Cookies können
          abgelehnt werden; in diesem Fall wird PostHog nicht geladen.
        </p>
      </section>

      <section>
        <h2>3. Hosting</h2>
        <p>
          Diese Website wird auf einem selbst verwalteten Server betrieben.
        </p>
        <p>
          Zur Bereitstellung der Website können technisch notwendige Verbindungsdaten
          verarbeitet werden. Die Verarbeitung erfolgt ausschließlich zur
          Gewährleistung der Sicherheit, Stabilität und Funktionsfähigkeit der Website.
        </p>
      </section>

      <section>
        <h2>4. Cloudflare</h2>
        <p>
          Für DNS- und Sicherheitsfunktionen wird Cloudflare eingesetzt.
        </p>
        <p>
          Cloudflare kann technisch notwendige Verbindungsdaten verarbeiten, um die
          sichere Auslieferung der Website zu gewährleisten.
        </p>
        <p>
          Weitere Informationen finden Sie in der Datenschutzerklärung von Cloudflare.
        </p>
      </section>

      <section>
        <h2>5. Webanalyse mit PostHog</h2>
        <p>
          Sofern Sie im Cookie-Banner zugestimmt haben, verwendet diese Website PostHog
          der PostHog, Inc. (USA) zur Analyse der Nutzung und zur Verbesserung des
          Angebots. Die Daten werden in der EU-Region von PostHog gespeichert.
        </p>
        <p>Dabei können insbesondere folgende Informationen verarbeitet werden:</p>
        <ul>
          <li>aufgerufene Seiten und die zuvor besuchte Seite (Referrer)</li>
          <li>Interaktionen innerhalb der Website, z. B. Klicks</li>
          <li>Browser- und Geräteinformationen</li>
          <li>ungefährer Standort, abgeleitet aus Ihrer IP-Adresse</li>
        </ul>
        <p>
          PostHog speichert dazu in Ihrem Browser ein Cookie und einen Eintrag im lokalen
          Speicher mit einer zufälligen Kennung, um wiederkehrende Besuche zu erkennen.
          Die Daten werden über den eigenen Server an PostHog weitergeleitet. Es werden
          keine Bildschirmaufzeichnungen erstellt und keine Anmeldedaten übermittelt.
        </p>
        <p>
          Ohne Ihre Zustimmung wird PostHog nicht geladen und es werden keine Daten an
          PostHog übermittelt. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1
          lit. a DSGVO, § 25 Abs. 1 TDDDG). Sie können Ihre Auswahl jederzeit über den
          Link „Cookies“ im Seitenfuß ändern und die Einwilligung so widerrufen. Dabei
          werden die von PostHog gespeicherten Daten aus Ihrem Browser entfernt.
        </p>
      </section>

      <section>
        <h2>6. Fehlerüberwachung mit Sentry</h2>
        <p>
          Um technische Fehler schnell zu erkennen und zu beheben, wird der Dienst Sentry
          der Functional Software, Inc. (USA) eingesetzt. Die Daten werden in der
          EU-Region von Sentry gespeichert.
        </p>
        <p>Im Fehlerfall können dabei insbesondere folgende Informationen verarbeitet werden:</p>
        <ul>
          <li>Fehlermeldung und technischer Ablauf des Fehlers (Stacktrace)</li>
          <li>aufgerufene Seite bzw. Schnittstelle und Zeitpunkt</li>
          <li>Browser-, Betriebssystem- und Geräteinformationen</li>
          <li>Ladezeiten einzelner Anfragen (für einen Teil der Aufrufe)</li>
          <li>
            eine Aufzeichnung der Bildschirminteraktionen kurz vor einem Fehler, in der
            alle Texte, Eingaben und Bilder unkenntlich gemacht sind
          </li>
        </ul>
        <p>
          Nicht an Sentry übermittelt werden Ihre Anmeldedaten (insbesondere Passwörter),
          Cookies und Ihre IP-Adresse: Fehlerberichte aus dem Browser werden über den
          eigenen Server weitergeleitet, sodass Sentry Ihre IP-Adresse nicht erhält.
          Sentry speichert keine Cookies oder sonstigen Daten auf Ihrem Gerät.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt
          im stabilen und fehlerfreien Betrieb der Website.
        </p>
      </section>

      <section>
        <h2>7. Weitergabe von Daten</h2>
        <p>
          Eine Weitergabe personenbezogener Daten erfolgt nur, soweit dies zur
          technischen Bereitstellung der Website erforderlich ist oder eine gesetzliche
          Verpflichtung besteht.
        </p>
      </section>

      <section>
        <h2>8. Rechte der betroffenen Personen</h2>
        <p>
          Sie haben nach der Datenschutz-Grundverordnung (DSGVO) das Recht auf:
        </p>
        <ul>
          <li>Auskunft</li>
          <li>Berichtigung</li>
          <li>Löschung</li>
          <li>Einschränkung der Verarbeitung</li>
          <li>Datenübertragbarkeit</li>
          <li>Widerspruch gegen die Verarbeitung</li>
        </ul>
        <p>
          Außerdem haben Sie das Recht, sich bei einer Datenschutzaufsichtsbehörde zu
          beschweren.
        </p>
      </section>

      <section>
        <h2>9. Kontakt</h2>
        <p>Bei Fragen zum Datenschutz können Sie sich an folgende Adresse wenden:</p>
        <p>
          <a href="mailto:support@timetablex.space">support@timetablex.space</a>
        </p>
      </section>

      <section>
        <h2>10. Änderungen dieser Datenschutzerklärung</h2>
        <p>
          Diese Datenschutzerklärung kann angepasst werden, wenn sich technische oder
          rechtliche Anforderungen ändern.
        </p>
      </section>
    </LegalDocument>
  );
}
