// Nederlandse juridische pagina's. Zelfde structuur als fr/legal.js — lees de
// opmerking daar eerst: deze drie URL's worden door de APPLICATIE geopend vanaf
// het toestemmingsscherm van de kandidaat. Een pad hier hernoemen breekt die
// links daar.

const legal = {
  draftNotice:
    "Werkdocument. De tekst hieronder beschrijft de werking van de dienst correct, maar is nog niet nagelezen door een jurist en enkele vermeldingen moeten nog worden aangevuld.",
  todoLabel: "Aan te vullen",
  updatedLabel: "Laatst bijgewerkt",
  backToHome: "Terug naar de startpagina",
  tocLabel: "Op deze pagina",

  terms: {
    title: "Algemene voorwaarden",
    updated: "15 september 2026",
    intro:
      "Deze voorwaarden regelen het gebruik van Onbord, een platform dat kandidaten evalueert via werksimulaties. Ze gelden zowel voor de klant die een abonnement afsluit als voor de kandidaat die wordt uitgenodigd voor een evaluatie.",
    sections: [
      {
        h: "1. Wie de dienst uitbaat",
        p: [
          "todo:Maatschappelijke benaming, rechtsvorm, maatschappelijke zetel, ondernemingsnummer (KBO) en btw-nummer van de uitbatende vennootschap.",
          "Voor elke vraag over deze voorwaarden: hello@onbord.be.",
        ],
      },
      {
        h: "2. Wat de dienst doet",
        p: [
          "Onbord zet een vacature om in een evaluatie: de dienst haalt er de verwachte vaardigheden uit, genereert een bijpassende werksimulatie en scoort vervolgens de antwoorden van kandidaten op criteria die de klant heeft nagelezen en goedgekeurd.",
          "De klant blijft als enige verantwoordelijk voor de aanwervingsbeslissing. Onbord levert een evaluatie en het bewijs erachter; het werft niet aan in de plaats van de klant en garandeert geen enkel aanwervingsresultaat.",
        ],
      },
      {
        h: "3. Accounts",
        p: [
          "Toegang tot de applicatie verloopt via een persoonlijk account. Accounts worden door Onbord aangemaakt op vraag van de klant; er is geen vrije online registratie.",
          "De klant is verantwoordelijk voor de vertrouwelijkheid van de inloggegevens van zijn team en voor de handelingen die vanaf zijn accounts worden gesteld. Verdacht gebruik moet onverwijld worden gemeld.",
        ],
      },
      {
        h: "4. Abonnement en credits",
        p: [
          "Een abonnement geeft recht op een aantal credits per periode. Een credit wordt op vier momenten verbruikt: bij het genereren van een simulatie (de eerste keer en bij elke volledige hergeneratie), bij het hergenereren van één stap van die simulatie, bij elke kandidaat die ze aflegt, en bij de correctie ervan. Alle andere functies zijn onbeperkt.",
          "todo:Duur van de periode, regel voor overdracht of vervallen van niet-gebruikte credits, modaliteiten voor verlenging, planwijziging en opzegging, opzegtermijn.",
          "todo:Facturatie- en betalingsvoorwaarden: vervaldag, betaalwijze, nalatigheidsinteresten, terugbetalingsbeleid.",
        ],
      },
      {
        h: "5. Aanvaardbaar gebruik",
        p: [
          "De klant verbindt zich ertoe Onbord enkel te gebruiken om echte sollicitaties voor echte vacatures te evalueren, en er geen kandidaat mee te discrimineren op een wettelijk beschermd criterium.",
          "Verboden zijn: de dienst doorverkopen, de inhoud ervan massaal geautomatiseerd extraheren, de limieten van het abonnement omzeilen, en onwettige inhoud plaatsen in vacatures of bedrijfsprofielen.",
        ],
      },
      {
        h: "6. Intellectuele eigendom",
        p: [
          "Het platform, de code, de evaluatiemodellen en de interface blijven eigendom van Onbord. Een abonnement verleent een gebruiksrecht, geen overdracht.",
          "Vacatures, bedrijfsinhoud en kandidaatgegevens die de klant aanlevert, blijven eigendom van de klant. Onbord gebruikt ze uitsluitend om de dienst te leveren, binnen de grenzen van het privacybeleid.",
        ],
      },
      {
        h: "7. Beschikbaarheid en aansprakelijkheid",
        p: [
          "Onbord doet redelijke inspanningen om de dienst beschikbaar te houden, zonder te garanderen dat er nooit een onderbreking is. Onderhoudsvensters kunnen nodig zijn.",
          "todo:Aansprakelijkheidsplafond, uitsluitingen (indirecte schade, verlies van een kans) en eventuele dienstverleningsverbintenis.",
        ],
      },
      {
        h: "8. Toepasselijk recht",
        p: [
          "Deze voorwaarden zijn onderworpen aan het Belgische recht.",
          "todo:Bevoegde rechtbank bij geschil, en vermelding van de voorafgaande minnelijke regeling.",
        ],
      },
    ],
  },

  privacy: {
    title: "Privacybeleid",
    updated: "15 september 2026",
    intro:
      "Deze pagina legt uit welke persoonsgegevens Onbord verwerkt, waarom, hoe lang, en wat u kunt eisen. Ze richt zich tot twee heel verschillende doelgroepen: de recruiter die het platform gebruikt, en de kandidaat die een evaluatie aflegt.",
    sections: [
      {
        h: "1. Verwerkingsverantwoordelijke",
        p: [
          "todo:Volledige identiteit en contactgegevens van de verwerkingsverantwoordelijke en, in voorkomend geval, van de functionaris voor gegevensbescherming.",
          "Voor elke vraag of om uw rechten uit te oefenen: hello@onbord.be.",
          "Een belangrijk onderscheid: wanneer een klant zijn kandidaten met Onbord evalueert, is die klant de verwerkingsverantwoordelijke voor die sollicitaties. Onbord treedt dan op als verwerker, voor zijn rekening en volgens zijn instructies.",
        ],
      },
      {
        h: "2. Verwerkte gegevens",
        p: [
          "Aan recruiterzijde: naam, professioneel e-mailadres, bedrijf, interfacevoorkeuren, gebruikslogboek van de dienst en facturatiegegevens.",
          "Aan kandidaatzijde: naam, e-mailadres, cv en opgeladen documenten, antwoorden geschreven tijdens de simulatie, audio- of video-opnames wanneer een oefening die voorziet, transcripties daarvan, behaalde scores en de bijbehorende motivering.",
          "Er worden geen gevoelige gegevens in de zin van de AVG gevraagd. Een kandidaat die ze spontaan in zijn cv vermeldt, deelt ze uit eigen beweging mee; die elementen spelen geen rol in de evaluatie.",
        ],
      },
      {
        h: "3. Doeleinden en rechtsgronden",
        p: [
          "De dienst leveren — de evaluatie genereren, laten afleggen, corrigeren en de resultaten aan de recruiter bezorgen: uitvoering van de overeenkomst met de klant, en het gerechtvaardigd belang van die klant om sollicitaties te beoordelen.",
          "Berichten versturen die bij het traject horen (uitnodiging, herinnering, feedback aan de kandidaat): uitvoering van de overeenkomst.",
          "De kwaliteit van de dienst verbeteren en misbruik voorkomen: gerechtvaardigd belang, op gegevens die tot het strikt noodzakelijke zijn beperkt.",
        ],
      },
      {
        h: "4. Wat er nooit met uw gegevens gebeurt",
        p: [
          "Kandidaatgegevens worden niet verkocht, niet verhuurd en niet doorgegeven aan derden voor reclamedoeleinden.",
          "Ze worden niet gebruikt om AI-modellen te trainen: de leveranciers waarop Onbord een beroep doet, zijn contractueel gebonden aan verbintenissen die training op via hun zakelijke interface ingediende inhoud uitsluiten.",
        ],
      },
      {
        h: "5. Verwerkers",
        p: [
          "Onbord doet een beroep op een beperkt aantal technische leveranciers, elk onder verwerkersovereenkomst: hosting van de applicatie en de website (Vercel), database en authenticatie (Supabase), door AI ondersteunde generatie en correctie (Anthropic), verzending van transactionele e-mails (Resend).",
          "todo:Plaats van verwerking en, voor doorgiften buiten de Europese Economische Ruimte, het gekozen juridische mechanisme (modelcontractbepalingen, adequaatheidsbesluit).",
        ],
      },
      {
        h: "6. Bewaartermijn",
        p: [
          "De gegevens van een kandidaat worden bewaard voor de duur van de betrokken aanwervingsprocedure en daarna verwijderd of geanonimiseerd. Elke nacht loopt een automatische opruiming op wat vervallen is.",
          "todo:Exacte bewaartermijn na afsluiting van een aanwerving, en bewaartermijn voor inactieve recruiteraccounts.",
        ],
      },
      {
        h: "7. Uw rechten",
        p: [
          "U hebt recht op inzage, verbetering, wissing, beperking, bezwaar en overdraagbaarheid van uw gegevens, en het recht om niet te worden onderworpen aan een uitsluitend geautomatiseerde beslissing (zie de pagina AI-transparantie).",
          "Een kandidaat richt zijn verzoek tot het bedrijf dat hem evalueert, of rechtstreeks tot hello@onbord.be: wij geven het door.",
          "U kunt klacht indienen bij de Gegevensbeschermingsautoriteit (gegevensbeschermingsautoriteit.be).",
        ],
      },
      {
        h: "8. Cookies",
        p: [
          "De publieke website gebruikt één cookie, die de in de taalkiezer gekozen taal onthoudt. Die is strikt noodzakelijk voor de werking van de site en dient niet voor reclametracking.",
          "todo:Aan te vullen als er meet- of marketingtools aan de site worden toegevoegd — die zouden een toestemmingsbanner verplicht maken.",
        ],
      },
    ],
  },

  ai: {
    title: "Transparantie over het gebruik van AI",
    updated: "15 september 2026",
    intro:
      "Onbord gebruikt artificiële intelligentie op verschillende plaatsen. Deze pagina zegt waar, wat de machine beslist, wat ze niet beslist, en wat u kunt eisen als een evaluatie u onrechtvaardig lijkt.",
    sections: [
      {
        h: "1. Waar AI tussenkomt",
        p: [
          "Het lezen van de vacature: een taalmodel haalt er de verwachte vaardigheden, het vereiste niveau en de context van de functie uit.",
          "Het opbouwen van de evaluatie: hetzelfde soort model schrijft de scenario's, de instructies en de scorecriteria die eruit volgen.",
          "De correctie: de antwoorden van de kandidaat worden met die criteria vergeleken en leveren een score op met een geschreven motivering, verankerd in precieze fragmenten van het antwoord.",
        ],
      },
      {
        h: "2. Wat AI niet beslist",
        p: [
          "Geen enkele kandidaat wordt ooit automatisch afgewezen door Onbord. Onbord stelt alleen een shortlist samen: de recruiter neemt altijd de uiteindelijke beslissing. De evaluatie levert niet meer op dan de score en het bewijsmateriaal achter die beslissing.",
          "De scorecriteria worden door de recruiter nagelezen en goedgekeurd vóór de eerste kandidaat de evaluatie aflegt. Een evaluatie gaat nooit live op basis van de keuzes van het model alleen.",
        ],
      },
      {
        h: "3. Gebruik van AI door de kandidaat",
        p: [
          "De simulaties laten het gebruik van AI-tools toe, omdat het echte werk dat ook doet. Ze verbieden zou betekenen dat men een situatie evalueert die niet meer bestaat.",
          "De kwaliteit van dat gebruik maakt deel uit van wat wordt geëvalueerd: weten wat je moet vragen, nagaan wat je terugkrijgt en corrigeren wat niet klopt, is een beroepsvaardigheid en wordt als dusdanig behandeld.",
        ],
      },
      {
        h: "4. Gekende beperkingen",
        p: [
          "Een taalmodel kan zich vergissen: een antwoord in een ongewone stijl verkeerd begrijpen, een audio-opname verkeerd transcriberen, of een criterium te letterlijk toepassen.",
          "Precies daarom komt elke score met zijn motivering en het fragment waarop ze steunt: een score die je niet tot haar bron kunt terugbrengen, mag nooit doorwegen op een beslissing.",
        ],
      },
      {
        h: "5. Menselijke herbeoordeling vragen",
        p: [
          "Elke kandidaat kan vragen dat een mens zijn evaluatie herbekijkt, de redenen achter de score krijgt en zijn standpunt kan laten gelden.",
          "Het verzoek gaat naar het bedrijf dat de aanwerving organiseert, of naar hello@onbord.be, dat het doorgeeft.",
        ],
      },
      {
        h: "6. Modelleveranciers",
        p: [
          "De gebruikte modellen zijn die van Anthropic (de Claude-familie), aangesproken via hun zakelijke interface.",
          "De doorgestuurde inhoud dient niet om die modellen te trainen. Zie het privacybeleid voor de volledige lijst van verwerkers.",
        ],
      },
    ],
  },
};

export default legal;
