import type { EmailStrings } from "./email-strings";

// Continuation of email-strings.ts: Nordic, Central European and Asian languages.

const ptPT: EmailStrings = {
  friend: "",
  clickStar: "Clique numa estrela para deixar uma avaliação",
  outOf5: "{rating} de 5",
  contactLine:
    "Se houve algum problema com a sua compra, diga-nos — estamos aqui para ajudar.",
  contactLink: "Contacte-nos.",
  footerOrdered: "Recebeu este e-mail porque fez uma encomenda em {shop_name}.",
  footerReviewed:
    "Recebeu este e-mail porque avaliou um produto de {shop_name}.",
  footerReviewLeft:
    "Recebeu este e-mail porque deixou uma avaliação em {shop_name}.",
  unsubscribeRequests: "Cancelar a subscrição dos pedidos de avaliação",
  unsubscribeOther: "Cancelar a subscrição destes e-mails",
  signOff: "Obrigado! — A equipa {shop_name}",
  initial: {
    subject: "{first_name}, como correu a sua encomenda {order_name}?",
    preheader: "Gostaríamos de saber a sua opinião sobre a sua encomenda",
    heading: "Diga-nos o que achou",
    body: "Olá {first_name},\n\nEsperamos que esteja a gostar da sua encomenda da {shop_name}. Se tiver alguma opinião sobre a sua compra, gostaríamos muito de a conhecer. O seu feedback ajuda-nos a nós e a futuros compradores. Só demora um minuto!",
    button: "Escrever uma avaliação",
  },
  reminder: {
    subject: "{first_name}, um pequeno lembrete",
    preheader: "Agradecíamos a sua opinião sobre a sua encomenda recente",
    heading: "Uma avaliação rápida ajuda-nos a nós e a outros compradores",
    body: "Olá {first_name},\n\nQueríamos saber como está a correr a sua compra na {shop_name}. Se quiser partilhar a sua opinião, gostaríamos muito de ler a sua avaliação. Ajuda outras pessoas e só demora um minuto!",
    button: "Escrever uma avaliação",
  },
  reply: {
    subject: "{first_name}, a sua avaliação recebeu uma resposta",
    preheader: "{shop_name} respondeu à sua avaliação recente.",
    heading: "A sua avaliação recebeu uma resposta!",
    body: "Olá {first_name},\n\nObrigado por avaliar {product_title}. A sua avaliação:",
    replyLabel: "Esta é a resposta de {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, confirme a sua avaliação",
    preheader: "Confirme que foi o próprio a escrever a avaliação.",
    heading: "Confirme a sua avaliação",
    body: "Olá {first_name},\n\nObrigado por enviar a sua avaliação de {product_title}. Para que as nossas avaliações se mantenham autênticas e úteis para outros compradores, confirme que foi o próprio a escrevê-la.\n\nA sua avaliação:",
    button: "Confirmar a minha avaliação",
  },
  footerAsked: "Recebeu este e-mail porque fez uma pergunta em {shop_name}.",
  answer: {
    subject: "{first_name}, a sua pergunta foi respondida",
    preheader: "{shop_name} respondeu à sua pergunta sobre {product_title}.",
    heading: "A sua pergunta foi respondida",
    body: "Olá {first_name},\n\nObrigado pela sua pergunta sobre {product_title}. Aqui estão a sua pergunta e a nossa resposta.",
    questionLabel: "A sua pergunta:",
    answerLabel: "Resposta de {shop_name}:",
  },
  page: {
    heading: "Avalie a sua compra",
    alsoInOrder: "Também na sua encomenda:",
    invalidTitle: "Esta ligação de avaliação não é válida",
    invalidText:
      "Pode ter expirado. Pode continuar a deixar uma avaliação na página do produto.",
    continueShopping: "Continuar a comprar",
  },
};

const sv: EmailStrings = {
  friend: "",
  clickStar: "Klicka på en stjärna för att lämna en recension",
  outOf5: "{rating} av 5",
  contactLine:
    "Om något var fel med ditt köp, hör av dig — vi hjälper gärna till.",
  contactLink: "Kontakta oss.",
  footerOrdered: "Du får detta mejl eftersom du har handlat hos {shop_name}.",
  footerReviewed:
    "Du får detta mejl eftersom du har recenserat en produkt från {shop_name}.",
  footerReviewLeft:
    "Du får detta mejl eftersom du har lämnat en recension hos {shop_name}.",
  unsubscribeRequests: "Avsluta prenumerationen på recensionsförfrågningar",
  unsubscribeOther: "Avsluta prenumerationen på dessa mejl",
  signOff: "Tack! — Teamet på {shop_name}",
  initial: {
    subject: "{first_name}, hur var din beställning {order_name}?",
    preheader: "Vi vill gärna höra vad du tycker om din beställning",
    heading: "Berätta vad du tycker",
    body: "Hej {first_name},\n\nVi hoppas att du är nöjd med din beställning från {shop_name}. Om du har några tankar om ditt köp vill vi gärna höra dem. Din feedback hjälper oss och framtida kunder. Det tar bara en minut!",
    button: "Skriv en recension",
  },
  reminder: {
    subject: "{first_name}, en snabb påminnelse",
    preheader: "Vi skulle uppskatta din feedback på din senaste beställning",
    heading: "En snabb recension hjälper oss och andra kunder",
    body: "Hej {first_name},\n\nVi ville höra hur det går med ditt köp från {shop_name}. Om du vill dela dina tankar läser vi gärna din recension. Den hjälper andra och tar bara en minut!",
    button: "Skriv en recension",
  },
  reply: {
    subject: "{first_name}, din recension har fått ett svar",
    preheader: "{shop_name} har svarat på din recension.",
    heading: "Din recension har fått ett svar!",
    body: "Hej {first_name},\n\nTack för din recension av {product_title}. Din recension:",
    replyLabel: "Här är svaret från {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, bekräfta din recension",
    preheader: "Bekräfta att det var du som skrev recensionen.",
    heading: "Bekräfta din recension",
    body: "Hej {first_name},\n\nTack för din recension av {product_title}. För att våra recensioner ska vara äkta och användbara för andra kunder ber vi dig bekräfta att det var du som skrev den.\n\nDin recension:",
    button: "Bekräfta min recension",
  },
  footerAsked: "Du får detta mejl eftersom du har ställt en fråga hos {shop_name}.",
  answer: {
    subject: "{first_name}, din fråga har besvarats",
    preheader: "{shop_name} har besvarat din fråga om {product_title}.",
    heading: "Din fråga har besvarats",
    body: "Hej {first_name},\n\nTack för din fråga om {product_title}. Här är din fråga och vårt svar.",
    questionLabel: "Din fråga:",
    answerLabel: "Svar från {shop_name}:",
  },
  page: {
    heading: "Recensera ditt köp",
    alsoInOrder: "Också i din beställning:",
    invalidTitle: "Den här recensionslänken är inte giltig",
    invalidText:
      "Den kan ha gått ut. Du kan fortfarande lämna en recension på produktsidan.",
    continueShopping: "Fortsätt handla",
  },
};

const da: EmailStrings = {
  friend: "",
  clickStar: "Klik på en stjerne for at skrive en anmeldelse",
  outOf5: "{rating} ud af 5",
  contactLine:
    "Hvis der var problemer med dit køb, så sig til — vi hjælper gerne.",
  contactLink: "Kontakt os.",
  footerOrdered:
    "Du modtager denne e-mail, fordi du har handlet hos {shop_name}.",
  footerReviewed:
    "Du modtager denne e-mail, fordi du har anmeldt et produkt fra {shop_name}.",
  footerReviewLeft:
    "Du modtager denne e-mail, fordi du har skrevet en anmeldelse hos {shop_name}.",
  unsubscribeRequests: "Afmeld anmodninger om anmeldelser",
  unsubscribeOther: "Afmeld disse e-mails",
  signOff: "Tak! — Holdet bag {shop_name}",
  initial: {
    subject: "{first_name}, hvordan var din ordre {order_name}?",
    preheader: "Vi vil meget gerne høre, hvad du synes om din ordre",
    heading: "Fortæl os, hvad du synes",
    body: "Hej {first_name},\n\nVi håber, du er glad for din ordre fra {shop_name}. Hvis du har tanker om dit køb, vil vi meget gerne høre dem. Din feedback hjælper os og fremtidige kunder. Det tager kun et minut!",
    button: "Skriv en anmeldelse",
  },
  reminder: {
    subject: "{first_name}, en hurtig påmindelse",
    preheader: "Vi vil sætte pris på din feedback på din seneste ordre",
    heading: "En hurtig anmeldelse hjælper os og andre kunder",
    body: "Hej {first_name},\n\nVi ville lige høre, hvordan det går med dit køb fra {shop_name}. Hvis du vil dele dine tanker, vil vi meget gerne læse din anmeldelse. Den hjælper andre og tager kun et minut!",
    button: "Skriv en anmeldelse",
  },
  reply: {
    subject: "{first_name}, din anmeldelse har fået et svar",
    preheader: "{shop_name} har svaret på din anmeldelse.",
    heading: "Din anmeldelse har fået et svar!",
    body: "Hej {first_name},\n\nTak for din anmeldelse af {product_title}. Din anmeldelse:",
    replyLabel: "Her er svaret fra {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, bekræft din anmeldelse",
    preheader: "Bekræft, at det var dig, der skrev anmeldelsen.",
    heading: "Bekræft din anmeldelse",
    body: "Hej {first_name},\n\nTak for din anmeldelse af {product_title}. For at holde vores anmeldelser ægte og brugbare for andre kunder beder vi dig bekræfte, at det var dig, der skrev den.\n\nDin anmeldelse:",
    button: "Bekræft min anmeldelse",
  },
  footerAsked: "Du modtager denne e-mail, fordi du har stillet et spørgsmål hos {shop_name}.",
  answer: {
    subject: "{first_name}, dit spørgsmål er blevet besvaret",
    preheader: "{shop_name} har besvaret dit spørgsmål om {product_title}.",
    heading: "Dit spørgsmål er blevet besvaret",
    body: "Hej {first_name},\n\nTak for dit spørgsmål om {product_title}. Her er dit spørgsmål og vores svar.",
    questionLabel: "Dit spørgsmål:",
    answerLabel: "Svar fra {shop_name}:",
  },
  page: {
    heading: "Anmeld dit køb",
    alsoInOrder: "Også i din ordre:",
    invalidTitle: "Dette anmeldelseslink er ikke gyldigt",
    invalidText:
      "Det er muligvis udløbet. Du kan stadig skrive en anmeldelse på produktsiden.",
    continueShopping: "Fortsæt med at handle",
  },
};

const nb: EmailStrings = {
  friend: "",
  clickStar: "Klikk på en stjerne for å gi en omtale",
  outOf5: "{rating} av 5",
  contactLine:
    "Hvis det var problemer med kjøpet ditt, gi oss beskjed — vi hjelper gjerne.",
  contactLink: "Kontakt oss.",
  footerOrdered:
    "Du mottar denne e-posten fordi du har handlet hos {shop_name}.",
  footerReviewed:
    "Du mottar denne e-posten fordi du har gitt en omtale av et produkt fra {shop_name}.",
  footerReviewLeft:
    "Du mottar denne e-posten fordi du har skrevet en omtale hos {shop_name}.",
  unsubscribeRequests: "Meld deg av forespørsler om omtaler",
  unsubscribeOther: "Meld deg av disse e-postene",
  signOff: "Takk! — Teamet i {shop_name}",
  initial: {
    subject: "{first_name}, hvordan var bestillingen din {order_name}?",
    preheader: "Vi vil gjerne høre hva du synes om bestillingen din",
    heading: "Fortell oss hva du synes",
    body: "Hei {first_name},\n\nVi håper du er fornøyd med bestillingen din fra {shop_name}. Hvis du har tanker om kjøpet, vil vi gjerne høre dem. Tilbakemeldingen din hjelper oss og fremtidige kunder. Det tar bare et minutt!",
    button: "Skriv en omtale",
  },
  reminder: {
    subject: "{first_name}, en rask påminnelse",
    preheader:
      "Vi setter pris på tilbakemeldingen din på den siste bestillingen",
    heading: "En rask omtale hjelper oss og andre kunder",
    body: "Hei {first_name},\n\nVi ville høre hvordan det går med kjøpet ditt fra {shop_name}. Hvis du vil dele tankene dine, leser vi gjerne omtalen din. Den hjelper andre og tar bare et minutt!",
    button: "Skriv en omtale",
  },
  reply: {
    subject: "{first_name}, omtalen din har fått et svar",
    preheader: "{shop_name} har svart på omtalen din.",
    heading: "Omtalen din har fått et svar!",
    body: "Hei {first_name},\n\nTakk for omtalen din av {product_title}. Omtalen din:",
    replyLabel: "Her er svaret fra {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, bekreft omtalen din",
    preheader: "Bekreft at det var du som skrev omtalen.",
    heading: "Bekreft omtalen din",
    body: "Hei {first_name},\n\nTakk for omtalen din av {product_title}. For at omtalene våre skal være ekte og nyttige for andre kunder, ber vi deg bekrefte at det var du som skrev den.\n\nOmtalen din:",
    button: "Bekreft omtalen min",
  },
  footerAsked: "Du mottar denne e-posten fordi du har stilt et spørsmål hos {shop_name}.",
  answer: {
    subject: "{first_name}, spørsmålet ditt er besvart",
    preheader: "{shop_name} har svart på spørsmålet ditt om {product_title}.",
    heading: "Spørsmålet ditt er besvart",
    body: "Hei {first_name},\n\nTakk for spørsmålet ditt om {product_title}. Her er spørsmålet ditt og svaret vårt.",
    questionLabel: "Spørsmålet ditt:",
    answerLabel: "Svar fra {shop_name}:",
  },
  page: {
    heading: "Gi en omtale av kjøpet ditt",
    alsoInOrder: "Også i bestillingen din:",
    invalidTitle: "Denne omtalelenken er ikke gyldig",
    invalidText:
      "Den kan ha utløpt. Du kan fortsatt gi en omtale på produktsiden.",
    continueShopping: "Fortsett å handle",
  },
};

const fi: EmailStrings = {
  friend: "",
  clickStar: "Jätä arvostelu klikkaamalla tähteä",
  outOf5: "{rating}/5",
  contactLine:
    "Jos ostoksessasi oli ongelmia, kerro meille — autamme mielellämme.",
  contactLink: "Ota yhteyttä.",
  footerOrdered:
    "Saat tämän viestin, koska teit tilauksen kaupasta {shop_name}.",
  footerReviewed:
    "Saat tämän viestin, koska arvostelit tuotteen kaupasta {shop_name}.",
  footerReviewLeft:
    "Saat tämän viestin, koska jätit arvostelun kauppaan {shop_name}.",
  unsubscribeRequests: "Peru arvostelupyyntöjen tilaus",
  unsubscribeOther: "Peru näiden viestien tilaus",
  signOff: "Kiitos! — {shop_name}-tiimi",
  initial: {
    subject: "{first_name}, millainen oli tilauksesi {order_name}?",
    preheader: "Kuulisimme mielellämme mielipiteesi tilauksestasi",
    heading: "Kerro meille mielipiteesi",
    body: "Hei {first_name},\n\nToivottavasti olet tyytyväinen tilaukseesi kaupasta {shop_name}. Jos sinulla on ajatuksia ostoksestasi, kuulisimme niistä mielellämme. Palautteesi auttaa meitä ja tulevia asiakkaita. Se vie vain minuutin!",
    button: "Kirjoita arvostelu",
  },
  reminder: {
    subject: "{first_name}, pieni muistutus",
    preheader: "Arvostaisimme palautettasi viimeisimmästä tilauksestasi",
    heading: "Lyhyt arvostelu auttaa meitä ja muita ostajia",
    body: "Hei {first_name},\n\nHalusimme kysyä, miten ostoksesi kaupasta {shop_name} on sujunut. Jos haluat jakaa ajatuksesi, luemme arvostelusi mielellämme. Se auttaa muita ja vie vain minuutin!",
    button: "Kirjoita arvostelu",
  },
  reply: {
    subject: "{first_name}, arvosteluusi on vastattu",
    preheader: "{shop_name} vastasi arvosteluusi.",
    heading: "Arvosteluusi on vastattu!",
    body: "Hei {first_name},\n\nKiitos arvostelustasi tuotteesta {product_title}. Arvostelusi:",
    replyLabel: "Tässä on vastaus kaupalta {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, vahvista arvostelusi",
    preheader: "Vahvista, että kirjoitit arvostelun itse.",
    heading: "Vahvista arvostelusi",
    body: "Hei {first_name},\n\nKiitos arvostelustasi tuotteesta {product_title}. Jotta arvostelumme pysyvät aitoina ja hyödyllisinä muille ostajille, vahvista, että kirjoitit sen itse.\n\nArvostelusi:",
    button: "Vahvista arvosteluni",
  },
  footerAsked: "Saat tämän viestin, koska esitit kysymyksen kaupassa {shop_name}.",
  answer: {
    subject: "{first_name}, kysymykseesi on vastattu",
    preheader: "{shop_name} vastasi kysymykseesi tuotteesta {product_title}.",
    heading: "Kysymykseesi on vastattu",
    body: "Hei {first_name},\n\nKiitos kysymyksestäsi tuotteesta {product_title}. Tässä kysymyksesi ja vastauksemme.",
    questionLabel: "Kysymyksesi:",
    answerLabel: "Vastaus kaupalta {shop_name}:",
  },
  page: {
    heading: "Arvostele ostoksesi",
    alsoInOrder: "Tilauksessasi myös:",
    invalidTitle: "Tämä arvostelulinkki ei ole voimassa",
    invalidText:
      "Linkki on voinut vanhentua. Voit silti jättää arvostelun tuotesivulla.",
    continueShopping: "Jatka ostoksia",
  },
};

const pl: EmailStrings = {
  friend: "",
  clickStar: "Kliknij gwiazdkę, aby wystawić opinię",
  outOf5: "{rating} na 5",
  contactLine:
    "Jeśli coś było nie tak z Twoim zakupem, daj nam znać — chętnie pomożemy.",
  contactLink: "Skontaktuj się z nami.",
  footerOrdered:
    "Otrzymujesz tę wiadomość, ponieważ złożono zamówienie w {shop_name}.",
  footerReviewed:
    "Otrzymujesz tę wiadomość, ponieważ wystawiono opinię o produkcie z {shop_name}.",
  footerReviewLeft:
    "Otrzymujesz tę wiadomość, ponieważ wystawiono opinię w {shop_name}.",
  unsubscribeRequests: "Wypisz się z próśb o opinie",
  unsubscribeOther: "Wypisz się z tych wiadomości",
  signOff: "Dziękujemy! — Zespół {shop_name}",
  initial: {
    subject: "{first_name}, jak Ci się podoba zamówienie {order_name}?",
    preheader: "Chętnie poznamy Twoją opinię o zamówieniu",
    heading: "Daj nam znać, co myślisz",
    body: "Cześć {first_name},\n\nMamy nadzieję, że zamówienie z {shop_name} spełnia Twoje oczekiwania. Jeśli chcesz podzielić się wrażeniami z zakupu, chętnie je poznamy. Twoja opinia pomaga nam i przyszłym klientom. To zajmie tylko minutę!",
    button: "Napisz opinię",
  },
  reminder: {
    subject: "{first_name}, krótkie przypomnienie",
    preheader: "Będziemy wdzięczni za opinię o Twoim ostatnim zamówieniu",
    heading: "Krótka opinia pomaga nam i innym kupującym",
    body: "Cześć {first_name},\n\nChcieliśmy zapytać, jak sprawdza się Twój zakup z {shop_name}. Jeśli chcesz podzielić się wrażeniami, chętnie przeczytamy Twoją opinię. Pomaga innym i zajmuje tylko minutę!",
    button: "Napisz opinię",
  },
  reply: {
    subject: "{first_name}, Twoja opinia otrzymała odpowiedź",
    preheader: "{shop_name} odpowiedział na Twoją opinię.",
    heading: "Twoja opinia otrzymała odpowiedź!",
    body: "Cześć {first_name},\n\nDziękujemy za opinię o produkcie {product_title}. Twoja opinia:",
    replyLabel: "Oto odpowiedź od {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, potwierdź swoją opinię",
    preheader: "Potwierdź, że to Ty napisałeś(-aś) tę opinię.",
    heading: "Potwierdź swoją opinię",
    body: "Cześć {first_name},\n\nDziękujemy za opinię o produkcie {product_title}. Aby nasze opinie były autentyczne i pomocne dla innych kupujących, potwierdź, że to Ty ją napisałeś(-aś).\n\nTwoja opinia:",
    button: "Potwierdź moją opinię",
  },
  footerAsked: "Otrzymujesz tę wiadomość, ponieważ zadano pytanie w {shop_name}.",
  answer: {
    subject: "{first_name}, Twoje pytanie otrzymało odpowiedź",
    preheader: "{shop_name} odpowiedział na Twoje pytanie o {product_title}.",
    heading: "Twoje pytanie otrzymało odpowiedź",
    body: "Cześć {first_name},\n\nDziękujemy za pytanie o {product_title}. Oto Twoje pytanie i nasza odpowiedź.",
    questionLabel: "Twoje pytanie:",
    answerLabel: "Odpowiedź od {shop_name}:",
  },
  page: {
    heading: "Oceń swój zakup",
    alsoInOrder: "Również w Twoim zamówieniu:",
    invalidTitle: "Ten link do opinii jest nieprawidłowy",
    invalidText:
      "Mógł wygasnąć. Nadal możesz wystawić opinię na stronie produktu.",
    continueShopping: "Kontynuuj zakupy",
  },
};

const cs: EmailStrings = {
  friend: "",
  clickStar: "Klikněte na hvězdičku a napište recenzi",
  outOf5: "{rating} z 5",
  contactLine:
    "Pokud byl s vaším nákupem nějaký problém, dejte nám vědět — rádi pomůžeme.",
  contactLink: "Kontaktujte nás.",
  footerOrdered:
    "Tento e-mail dostáváte, protože jste nakoupili v obchodě {shop_name}.",
  footerReviewed:
    "Tento e-mail dostáváte, protože jste ohodnotili produkt z obchodu {shop_name}.",
  footerReviewLeft:
    "Tento e-mail dostáváte, protože jste napsali recenzi v obchodě {shop_name}.",
  unsubscribeRequests: "Odhlásit žádosti o recenze",
  unsubscribeOther: "Odhlásit tyto e-maily",
  signOff: "Děkujeme! — Tým {shop_name}",
  initial: {
    subject: "{first_name}, jak jste spokojeni s objednávkou {order_name}?",
    preheader: "Rádi bychom znali váš názor na objednávku",
    heading: "Dejte nám vědět, co si myslíte",
    body: "Dobrý den {first_name},\n\ndoufáme, že jste s objednávkou z obchodu {shop_name} spokojeni. Pokud se chcete podělit o dojmy z nákupu, rádi si je přečteme. Vaše zpětná vazba pomáhá nám i dalším zákazníkům. Zabere to jen minutu!",
    button: "Napsat recenzi",
  },
  reminder: {
    subject: "{first_name}, krátká připomínka",
    preheader: "Budeme rádi za váš názor na nedávnou objednávku",
    heading: "Krátká recenze pomůže nám i ostatním zákazníkům",
    body: "Dobrý den {first_name},\n\nchtěli jsme se zeptat, jak jste spokojeni s nákupem z obchodu {shop_name}. Pokud se chcete podělit o názor, rádi si přečteme vaši recenzi. Pomůže ostatním a zabere jen minutu!",
    button: "Napsat recenzi",
  },
  reply: {
    subject: "{first_name}, na vaši recenzi přišla odpověď",
    preheader: "{shop_name} odpověděl na vaši recenzi.",
    heading: "Na vaši recenzi přišla odpověď!",
    body: "Dobrý den {first_name},\n\nděkujeme za recenzi produktu {product_title}. Vaše recenze:",
    replyLabel: "Odpověď od {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, potvrďte prosím svou recenzi",
    preheader: "Potvrďte, že jste recenzi napsali vy.",
    heading: "Potvrďte prosím svou recenzi",
    body: "Dobrý den {first_name},\n\nděkujeme za recenzi produktu {product_title}. Aby naše recenze zůstaly pravé a užitečné pro ostatní zákazníky, potvrďte prosím, že jste ji napsali vy.\n\nVaše recenze:",
    button: "Potvrdit recenzi",
  },
  footerAsked: "Tento e-mail dostáváte, protože jste položili otázku v obchodě {shop_name}.",
  answer: {
    subject: "{first_name}, na vaši otázku přišla odpověď",
    preheader: "{shop_name} odpověděl na vaši otázku k produktu {product_title}.",
    heading: "Na vaši otázku přišla odpověď",
    body: "Dobrý den {first_name},\n\nděkujeme za otázku k produktu {product_title}. Zde je vaše otázka a naše odpověď.",
    questionLabel: "Vaše otázka:",
    answerLabel: "Odpověď od {shop_name}:",
  },
  page: {
    heading: "Ohodnoťte svůj nákup",
    alsoInOrder: "Ve vaší objednávce je také:",
    invalidTitle: "Tento odkaz na recenzi není platný",
    invalidText:
      "Možná vypršel. Recenzi můžete stále napsat na stránce produktu.",
    continueShopping: "Pokračovat v nákupu",
  },
};

const tr: EmailStrings = {
  friend: "",
  clickStar: "Değerlendirme bırakmak için bir yıldıza tıkla",
  outOf5: "5 üzerinden {rating}",
  contactLine:
    "Satın aldığın üründe bir sorun olduysa bize bildir — yardım etmek için buradayız.",
  contactLink: "Bize ulaş.",
  footerOrdered:
    "Bu e-postayı {shop_name} mağazasından sipariş verdiğin için aldın.",
  footerReviewed:
    "Bu e-postayı {shop_name} mağazasından bir ürünü değerlendirdiğin için aldın.",
  footerReviewLeft:
    "Bu e-postayı {shop_name} mağazasında değerlendirme bıraktığın için aldın.",
  unsubscribeRequests: "Değerlendirme isteği e-postalarından çık",
  unsubscribeOther: "Bu e-postalardan çık",
  signOff: "Teşekkürler! — {shop_name} ekibi",
  initial: {
    subject: "{first_name}, {order_name} numaralı siparişin nasıldı?",
    preheader: "Siparişin hakkındaki görüşlerini duymak isteriz",
    heading: "Ne düşündüğünü bize anlat",
    body: "Merhaba {first_name},\n\n{shop_name} siparişinden memnun kaldığını umuyoruz. Satın aldığın ürün hakkında düşüncelerin varsa duymayı çok isteriz. Geri bildirimin bize ve gelecekteki alışverişçilere yardımcı olur. Sadece bir dakika sürer!",
    button: "Değerlendirme yaz",
  },
  reminder: {
    subject: "{first_name}, kısa bir hatırlatma",
    preheader: "Son siparişin hakkındaki görüşlerin bizim için değerli",
    heading:
      "Kısa bir değerlendirme bize ve diğer alışverişçilere yardımcı olur",
    body: "Merhaba {first_name},\n\n{shop_name} alışverişinin nasıl gittiğini merak ettik. Düşüncelerini paylaşmak istersen değerlendirmeni okumayı çok isteriz. Başkalarına yardımcı olur ve sadece bir dakika sürer!",
    button: "Değerlendirme yaz",
  },
  reply: {
    subject: "{first_name}, değerlendirmen yanıtlandı",
    preheader: "{shop_name} değerlendirmeni yanıtladı.",
    heading: "Değerlendirmen yanıtlandı!",
    body: "Merhaba {first_name},\n\n{product_title} için değerlendirme bıraktığın için teşekkürler. Değerlendirmen:",
    replyLabel: "{shop_name} yanıtı:",
  },
  confirm: {
    subject: "{first_name}, lütfen değerlendirmeni onayla",
    preheader: "Değerlendirmeyi senin yazdığını onayla.",
    heading: "Lütfen değerlendirmeni onayla",
    body: "Merhaba {first_name},\n\n{product_title} için değerlendirme gönderdiğin için teşekkürler. Değerlendirmelerimizin gerçek ve diğer alışverişçiler için faydalı kalması için lütfen onu senin yazdığını onayla.\n\nDeğerlendirmen:",
    button: "Değerlendirmemi onayla",
  },
  footerAsked: "Bu e-postayı {shop_name} mağazasında bir soru sorduğun için aldın.",
  answer: {
    subject: "{first_name}, soruna yanıt verildi",
    preheader: "{shop_name}, {product_title} hakkındaki sorunu yanıtladı.",
    heading: "Soruna yanıt verildi",
    body: "Merhaba {first_name},\n\n{product_title} hakkında soru sorduğun için teşekkürler. İşte sorun ve yanıtımız.",
    questionLabel: "Sorun:",
    answerLabel: "{shop_name} yanıtı:",
  },
  page: {
    heading: "Satın aldığın ürünü değerlendir",
    alsoInOrder: "Siparişinde ayrıca:",
    invalidTitle: "Bu değerlendirme bağlantısı geçerli değil",
    invalidText:
      "Süresi dolmuş olabilir. Yine de ürün sayfasında değerlendirme bırakabilirsin.",
    continueShopping: "Alışverişe devam et",
  },
};

const ja: EmailStrings = {
  friend: "お客",
  clickStar: "星をクリックしてレビューを投稿",
  outOf5: "5段階中{rating}",
  contactLine: "ご購入の商品に問題がありましたら、お気軽にご連絡ください。",
  contactLink: "お問い合わせはこちら",
  footerOrdered:
    "このメールは、{shop_name}でご注文いただいたお客様にお送りしています。",
  footerReviewed:
    "このメールは、{shop_name}の商品をレビューいただいたお客様にお送りしています。",
  footerReviewLeft:
    "このメールは、{shop_name}にレビューを投稿いただいたお客様にお送りしています。",
  unsubscribeRequests: "レビュー依頼メールの配信を停止",
  unsubscribeOther: "これらのメールの配信を停止",
  signOff: "ありがとうございました。— {shop_name}",
  initial: {
    subject: "{first_name}様、ご注文{order_name}はいかがでしたか？",
    preheader: "ご注文についてのご感想をお聞かせください",
    heading: "ご感想をお聞かせください",
    body: "{first_name}様\n\n{shop_name}でのご注文をお楽しみいただけていれば幸いです。ご購入いただいた商品についてのご感想をぜひお聞かせください。いただいたご意見は、私たちと今後のお客様の参考になります。所要時間は1分ほどです。",
    button: "レビューを書く",
  },
  reminder: {
    subject: "{first_name}様、レビューのお願い",
    preheader: "最近のご注文についてご感想をいただけると嬉しいです",
    heading: "短いレビューが私たちと他のお客様の役に立ちます",
    body: "{first_name}様\n\n{shop_name}でのお買い物はいかがでしたか？ご感想をお聞かせいただけると大変嬉しく思います。他のお客様の参考にもなり、所要時間は1分ほどです。",
    button: "レビューを書く",
  },
  reply: {
    subject: "{first_name}様、レビューに返信がありました",
    preheader: "{shop_name}からレビューへの返信が届きました。",
    heading: "レビューに返信がありました",
    body: "{first_name}様\n\n{product_title}のレビューをありがとうございます。お客様のレビュー：",
    replyLabel: "{shop_name}からの返信：",
  },
  confirm: {
    subject: "{first_name}様、レビューの確認をお願いします",
    preheader: "ご本人によるレビューであることをご確認ください。",
    heading: "レビューの確認をお願いします",
    body: "{first_name}様\n\n{product_title}のレビューをお送りいただきありがとうございます。レビューの信頼性を保つため、ご本人が書いたレビューであることをご確認ください。\n\nお客様のレビュー：",
    button: "レビューを確認する",
  },
  footerAsked: "このメールは、{shop_name}で質問をいただいたお客様にお送りしています。",
  answer: {
    subject: "{first_name}様、ご質問に回答がありました",
    preheader: "{shop_name}が{product_title}についてのご質問に回答しました。",
    heading: "ご質問に回答がありました",
    body: "{first_name}様\n\n{product_title}についてご質問いただきありがとうございます。ご質問と回答は以下のとおりです。",
    questionLabel: "ご質問：",
    answerLabel: "{shop_name}からの回答：",
  },
  page: {
    heading: "ご購入商品のレビュー",
    alsoInOrder: "ご注文に含まれる他の商品：",
    invalidTitle: "このレビューリンクは無効です",
    invalidText:
      "有効期限が切れている可能性があります。商品ページからレビューを投稿することもできます。",
    continueShopping: "買い物を続ける",
  },
};

const ko: EmailStrings = {
  friend: "고객",
  clickStar: "별을 클릭해 리뷰를 남겨 주세요",
  outOf5: "5점 만점에 {rating}점",
  contactLine:
    "구매하신 상품에 문제가 있었다면 알려 주세요. 기꺼이 도와드리겠습니다.",
  contactLink: "문의하기",
  footerOrdered: "{shop_name}에서 주문하셨기 때문에 이 이메일을 받으셨습니다.",
  footerReviewed:
    "{shop_name}의 상품에 리뷰를 남기셨기 때문에 이 이메일을 받으셨습니다.",
  footerReviewLeft:
    "{shop_name}에 리뷰를 남기셨기 때문에 이 이메일을 받으셨습니다.",
  unsubscribeRequests: "리뷰 요청 이메일 수신 거부",
  unsubscribeOther: "이 이메일 수신 거부",
  signOff: "감사합니다! — {shop_name} 팀",
  initial: {
    subject: "{first_name}님, 주문하신 {order_name}은(는) 어떠셨나요?",
    preheader: "최근 주문에 대한 의견을 들려주세요",
    heading: "어떠셨는지 알려 주세요",
    body: "{first_name}님, 안녕하세요.\n\n{shop_name}에서 주문하신 상품이 마음에 드셨기를 바랍니다. 구매하신 상품에 대한 생각을 들려주시면 감사하겠습니다. 여러분의 의견은 저희와 다른 고객에게 큰 도움이 됩니다. 1분이면 충분합니다!",
    button: "리뷰 작성",
  },
  reminder: {
    subject: "{first_name}님, 리뷰를 부탁드려요",
    preheader: "최근 주문에 대한 의견을 기다리고 있습니다",
    heading: "짧은 리뷰가 저희와 다른 고객에게 도움이 됩니다",
    body: "{first_name}님, 안녕하세요.\n\n{shop_name}에서 구매하신 상품은 잘 사용하고 계신가요? 의견을 공유해 주시면 리뷰를 꼭 읽어 보겠습니다. 다른 고객에게 도움이 되며 1분이면 충분합니다!",
    button: "리뷰 작성",
  },
  reply: {
    subject: "{first_name}님, 리뷰에 답변이 달렸습니다",
    preheader: "{shop_name}에서 회원님의 리뷰에 답변했습니다.",
    heading: "리뷰에 답변이 달렸습니다!",
    body: "{first_name}님, 안녕하세요.\n\n{product_title}에 리뷰를 남겨 주셔서 감사합니다. 작성하신 리뷰:",
    replyLabel: "{shop_name}의 답변:",
  },
  confirm: {
    subject: "{first_name}님, 리뷰를 확인해 주세요",
    preheader: "직접 작성하신 리뷰인지 확인해 주세요.",
    heading: "리뷰를 확인해 주세요",
    body: "{first_name}님, 안녕하세요.\n\n{product_title}에 리뷰를 남겨 주셔서 감사합니다. 리뷰의 신뢰성을 지키기 위해 직접 작성하신 리뷰인지 확인해 주세요.\n\n작성하신 리뷰:",
    button: "리뷰 확인",
  },
  footerAsked: "{shop_name}에 질문을 남기셨기 때문에 이 이메일을 받으셨습니다.",
  answer: {
    subject: "{first_name}님, 질문에 답변이 달렸습니다",
    preheader: "{shop_name}에서 {product_title}에 대한 질문에 답변했습니다.",
    heading: "질문에 답변이 달렸습니다",
    body: "{first_name}님, 안녕하세요.\n\n{product_title}에 대해 문의해 주셔서 감사합니다. 질문과 답변은 다음과 같습니다.",
    questionLabel: "질문:",
    answerLabel: "{shop_name}의 답변:",
  },
  page: {
    heading: "구매하신 상품 리뷰",
    alsoInOrder: "주문에 포함된 다른 상품:",
    invalidTitle: "유효하지 않은 리뷰 링크입니다",
    invalidText:
      "링크가 만료되었을 수 있습니다. 상품 페이지에서 리뷰를 남길 수 있습니다.",
    continueShopping: "쇼핑 계속하기",
  },
};

const zhCN: EmailStrings = {
  friend: "",
  clickStar: "点击星星即可发表评价",
  outOf5: "{rating}/5",
  contactLine: "如果您的购买遇到任何问题，请告诉我们，我们随时为您提供帮助。",
  contactLink: "联系我们。",
  footerOrdered: "您收到此邮件是因为您在 {shop_name} 下过订单。",
  footerReviewed: "您收到此邮件是因为您评价过 {shop_name} 的商品。",
  footerReviewLeft: "您收到此邮件是因为您在 {shop_name} 发表过评价。",
  unsubscribeRequests: "退订评价邀请邮件",
  unsubscribeOther: "退订这些邮件",
  signOff: "谢谢！— {shop_name} 团队",
  initial: {
    subject: "{first_name}，您的订单 {order_name} 怎么样？",
    preheader: "期待听到您对订单的反馈",
    heading: "告诉我们您的想法",
    body: "{first_name}您好：\n\n希望您喜欢在 {shop_name} 购买的商品。如果您对本次购买有任何想法，我们很乐意听到。您的反馈对我们和未来的顾客都很有帮助。只需一分钟！",
    button: "写评价",
  },
  reminder: {
    subject: "{first_name}，温馨提醒",
    preheader: "期待您对最近订单的反馈",
    heading: "简短的评价能帮助我们和其他顾客",
    body: "{first_name}您好：\n\n想问问您在 {shop_name} 购买的商品使用得怎么样。如果您愿意分享看法，我们很期待阅读您的评价。它能帮助其他顾客，只需一分钟！",
    button: "写评价",
  },
  reply: {
    subject: "{first_name}，您的评价收到了回复",
    preheader: "{shop_name} 回复了您的评价。",
    heading: "您的评价收到了回复！",
    body: "{first_name}您好：\n\n感谢您为 {product_title} 发表评价。您的评价：",
    replyLabel: "{shop_name} 的回复：",
  },
  confirm: {
    subject: "{first_name}，请确认您的评价",
    preheader: "请确认这条评价是您本人所写。",
    heading: "请确认您的评价",
    body: "{first_name}您好：\n\n感谢您提交对 {product_title} 的评价。为了保证评价真实可靠、对其他顾客有帮助，请确认这条评价是您本人所写。\n\n您的评价：",
    button: "确认我的评价",
  },
  footerAsked: "您收到此邮件是因为您在 {shop_name} 提出过问题。",
  answer: {
    subject: "{first_name}，您的问题已得到回答",
    preheader: "{shop_name} 回答了您关于 {product_title} 的问题。",
    heading: "您的问题已得到回答",
    body: "{first_name}您好：\n\n感谢您咨询 {product_title}。以下是您的问题和我们的回答。",
    questionLabel: "您的问题：",
    answerLabel: "{shop_name} 的回答：",
  },
  page: {
    heading: "评价您购买的商品",
    alsoInOrder: "您订单中的其他商品：",
    invalidTitle: "此评价链接无效",
    invalidText: "链接可能已过期。您仍可以在商品页面发表评价。",
    continueShopping: "继续购物",
  },
};

const zhTW: EmailStrings = {
  friend: "",
  clickStar: "點擊星星即可撰寫評論",
  outOf5: "{rating}/5",
  contactLine: "如果你的購買遇到任何問題，請告訴我們，我們隨時樂意協助。",
  contactLink: "聯絡我們。",
  footerOrdered: "你收到這封郵件是因為你曾在 {shop_name} 下單。",
  footerReviewed: "你收到這封郵件是因為你曾評論 {shop_name} 的商品。",
  footerReviewLeft: "你收到這封郵件是因為你曾在 {shop_name} 留下評論。",
  unsubscribeRequests: "取消訂閱評論邀請郵件",
  unsubscribeOther: "取消訂閱這些郵件",
  signOff: "謝謝！— {shop_name} 團隊",
  initial: {
    subject: "{first_name}，你的訂單 {order_name} 還滿意嗎？",
    preheader: "很想聽聽你對訂單的意見",
    heading: "告訴我們你的想法",
    body: "{first_name}你好：\n\n希望你喜歡在 {shop_name} 購買的商品。如果你對這次購買有任何想法，我們很樂意聽聽。你的意見對我們和未來的顧客都很有幫助。只需要一分鐘！",
    button: "撰寫評論",
  },
  reminder: {
    subject: "{first_name}，小提醒",
    preheader: "期待你對最近訂單的意見",
    heading: "簡短的評論能幫助我們和其他顧客",
    body: "{first_name}你好：\n\n想問問你在 {shop_name} 購買的商品用得如何。如果你願意分享想法，我們很期待讀到你的評論。它能幫助其他人，只需要一分鐘！",
    button: "撰寫評論",
  },
  reply: {
    subject: "{first_name}，你的評論收到了回覆",
    preheader: "{shop_name} 回覆了你的評論。",
    heading: "你的評論收到了回覆！",
    body: "{first_name}你好：\n\n感謝你為 {product_title} 留下評論。你的評論：",
    replyLabel: "{shop_name} 的回覆：",
  },
  confirm: {
    subject: "{first_name}，請確認你的評論",
    preheader: "請確認這則評論是你本人撰寫。",
    heading: "請確認你的評論",
    body: "{first_name}你好：\n\n感謝你送出 {product_title} 的評論。為了讓評論保持真實並對其他顧客有幫助，請確認這則評論是你本人撰寫。\n\n你的評論：",
    button: "確認我的評論",
  },
  footerAsked: "你收到這封郵件是因為你曾在 {shop_name} 提出問題。",
  answer: {
    subject: "{first_name}，你的問題已獲得回答",
    preheader: "{shop_name} 回答了你關於 {product_title} 的問題。",
    heading: "你的問題已獲得回答",
    body: "{first_name}你好：\n\n感謝你詢問 {product_title}。以下是你的問題和我們的回答。",
    questionLabel: "你的問題：",
    answerLabel: "{shop_name} 的回答：",
  },
  page: {
    heading: "評論你購買的商品",
    alsoInOrder: "你的訂單中還有：",
    invalidTitle: "這個評論連結無效",
    invalidText: "連結可能已過期。你仍然可以在商品頁面留下評論。",
    continueShopping: "繼續購物",
  },
};

export const MORE = {
  "pt-PT": ptPT,
  sv,
  da,
  nb,
  fi,
  pl,
  cs,
  tr,
  ja,
  ko,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};
