// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Mitglieder {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    geschlecht?: LookupValue;
    email?: string;
    telefon?: string;
    strasse?: string;
    hausnummer?: string;
    postleitzahl?: string;
    stadt?: string;
    mitgliedschaft_typ?: LookupValue;
    mitglied_seit?: string; // Format: YYYY-MM-DD oder ISO String
    notfall_vorname?: string;
    notfall_nachname?: string;
    notfall_telefon?: string;
    gesundheitshinweise?: string;
  };
}

export interface Buchungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    mitglied?: string; // applookup -> URL zu 'Mitglieder' Record
    kurs?: string; // applookup -> URL zu 'Kurse' Record
    zahlungsstatus?: LookupValue;
    zahlungsart?: LookupValue;
    betrag?: number;
    anmerkungen?: string;
    buchungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface Trainer {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    nachname?: string;
    email?: string;
    telefon?: string;
    spezialisierungen?: LookupValue[];
    ausbildung?: string;
    erfahrung_jahre?: number;
    biografie?: string;
    foto?: string;
    vorname?: string;
  };
}

export interface Kurse {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kursname?: string;
    yoga_stil?: LookupValue;
    beschreibung?: string;
    niveau?: LookupValue;
    wochentag?: LookupValue[];
    uhrzeit?: string;
    dauer_minuten?: number;
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    enddatum?: string; // Format: YYYY-MM-DD oder ISO String
    raum?: string;
    max_teilnehmer?: number;
    kursgebuehr?: number;
    trainer?: string; // applookup -> URL zu 'Trainer' Record
  };
}

export const APP_IDS = {
  MITGLIEDER: '69c64ca94239a6f64d141247',
  BUCHUNGEN: '69c64caa332ffb5d818518fb',
  TRAINER: '69c64ca4e8626bc986a4e869',
  KURSE: '69c64ca968df8b8b7588964b',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'mitglieder': {
    geschlecht: [{ key: "weiblich", label: "Weiblich" }, { key: "maennlich", label: "Männlich" }, { key: "divers", label: "Divers" }, { key: "keine_angabe", label: "Keine Angabe" }],
    mitgliedschaft_typ: [{ key: "einzelstunde", label: "Einzelstunde" }, { key: "zehnerkarte", label: "10er-Karte" }, { key: "monat", label: "Monatsmitgliedschaft" }, { key: "jahr", label: "Jahresmitgliedschaft" }, { key: "schnupperkurs", label: "Schnupperkurs" }],
  },
  'buchungen': {
    zahlungsstatus: [{ key: "ausstehend", label: "Ausstehend" }, { key: "bezahlt", label: "Bezahlt" }, { key: "storniert", label: "Storniert" }],
    zahlungsart: [{ key: "bar", label: "Bar" }, { key: "ueberweisung", label: "Überweisung" }, { key: "ec_karte", label: "EC-Karte" }, { key: "kreditkarte", label: "Kreditkarte" }, { key: "paypal", label: "PayPal" }],
  },
  'trainer': {
    spezialisierungen: [{ key: "hatha", label: "Hatha Yoga" }, { key: "vinyasa", label: "Vinyasa Yoga" }, { key: "yin", label: "Yin Yoga" }, { key: "ashtanga", label: "Ashtanga Yoga" }, { key: "kundalini", label: "Kundalini Yoga" }, { key: "restorative", label: "Restorative Yoga" }, { key: "power", label: "Power Yoga" }, { key: "bikram", label: "Bikram Yoga" }],
  },
  'kurse': {
    yoga_stil: [{ key: "hatha", label: "Hatha Yoga" }, { key: "vinyasa", label: "Vinyasa Yoga" }, { key: "yin", label: "Yin Yoga" }, { key: "ashtanga", label: "Ashtanga Yoga" }, { key: "kundalini", label: "Kundalini Yoga" }, { key: "restorative", label: "Restorative Yoga" }, { key: "power", label: "Power Yoga" }, { key: "bikram", label: "Bikram Yoga" }, { key: "sonstiges", label: "Sonstiges" }],
    niveau: [{ key: "anfaenger", label: "Anfänger" }, { key: "fortgeschrittene", label: "Fortgeschrittene" }, { key: "alle", label: "Alle Niveaus" }],
    wochentag: [{ key: "montag", label: "Montag" }, { key: "dienstag", label: "Dienstag" }, { key: "mittwoch", label: "Mittwoch" }, { key: "donnerstag", label: "Donnerstag" }, { key: "freitag", label: "Freitag" }, { key: "samstag", label: "Samstag" }, { key: "sonntag", label: "Sonntag" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'mitglieder': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'geburtsdatum': 'date/date',
    'geschlecht': 'lookup/radio',
    'email': 'string/email',
    'telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'postleitzahl': 'string/text',
    'stadt': 'string/text',
    'mitgliedschaft_typ': 'lookup/select',
    'mitglied_seit': 'date/date',
    'notfall_vorname': 'string/text',
    'notfall_nachname': 'string/text',
    'notfall_telefon': 'string/tel',
    'gesundheitshinweise': 'string/textarea',
  },
  'buchungen': {
    'mitglied': 'applookup/select',
    'kurs': 'applookup/select',
    'zahlungsstatus': 'lookup/radio',
    'zahlungsart': 'lookup/select',
    'betrag': 'number',
    'anmerkungen': 'string/textarea',
    'buchungsdatum': 'date/date',
  },
  'trainer': {
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'spezialisierungen': 'multiplelookup/checkbox',
    'ausbildung': 'string/textarea',
    'erfahrung_jahre': 'number',
    'biografie': 'string/textarea',
    'foto': 'file',
    'vorname': 'string/text',
  },
  'kurse': {
    'kursname': 'string/text',
    'yoga_stil': 'lookup/select',
    'beschreibung': 'string/textarea',
    'niveau': 'lookup/radio',
    'wochentag': 'multiplelookup/checkbox',
    'uhrzeit': 'string/text',
    'dauer_minuten': 'number',
    'startdatum': 'date/date',
    'enddatum': 'date/date',
    'raum': 'string/text',
    'max_teilnehmer': 'number',
    'kursgebuehr': 'number',
    'trainer': 'applookup/select',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateMitglieder = StripLookup<Mitglieder['fields']>;
export type CreateBuchungen = StripLookup<Buchungen['fields']>;
export type CreateTrainer = StripLookup<Trainer['fields']>;
export type CreateKurse = StripLookup<Kurse['fields']>;