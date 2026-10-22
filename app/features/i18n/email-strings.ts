// Customer-facing text the app renders itself (emails, the email-link review page),
// per language. Form labels and errors on that page come from the theme extension's
// locale files (storefront.ts). Placeholders: {first_name} {shop_name} {order_name}
// {product_title} {rating}.

export type CopyStrings = {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
  button: string;
};

export type EmailStrings = {
  /** Used for {first_name} when the customer's name is unknown ("" = drop it). */
  friend: string;
  clickStar: string;
  outOf5: string;
  contactLine: string;
  contactLink: string;
  footerOrdered: string;
  footerReviewed: string;
  footerReviewLeft: string;
  unsubscribeRequests: string;
  unsubscribeOther: string;
  signOff: string;
  initial: CopyStrings;
  reminder: CopyStrings;
  reply: Omit<CopyStrings, "button"> & { replyLabel: string };
  confirm: CopyStrings;
  footerAsked: string;
  /** Q&A: email to the customer when their question is answered. */
  answer: {
    subject: string;
    preheader: string;
    heading: string;
    body: string;
    questionLabel: string;
    answerLabel: string;
  };
  page: {
    heading: string;
    alsoInOrder: string;
    invalidTitle: string;
    invalidText: string;
    continueShopping: string;
  };
};

const en: EmailStrings = {
  friend: "there",
  clickStar: "Click a star to leave a review",
  outOf5: "{rating} out of 5",
  contactLine:
    "If there were issues with your purchase, let us know — we're here to help.",
  contactLink: "Reach out to us.",
  footerOrdered: "You received this because you ordered from {shop_name}.",
  footerReviewed:
    "You received this because you reviewed a product from {shop_name}.",
  footerReviewLeft:
    "You received this because you left a review on {shop_name}.",
  unsubscribeRequests: "Unsubscribe from review request emails",
  unsubscribeOther: "Unsubscribe from these emails",
  signOff: "Thanks! — The {shop_name} team",
  initial: {
    subject: "{first_name}, how was your order {order_name}?",
    preheader: "We'd love your feedback on your recent order",
    heading: "Let us know what you think",
    body: "Hi {first_name},\n\nWe hope you're enjoying your order from {shop_name}. If you have any thoughts on your purchase, we'd love to hear them. Your feedback helps us and future shoppers. It only takes a minute!",
    button: "Write a review",
  },
  reminder: {
    subject: "{first_name}, just a quick reminder",
    preheader: "We'd appreciate your feedback on your recent order",
    heading: "A quick review helps us and other shoppers",
    body: "Hi {first_name},\n\nJust checking in to see how things are going with your purchase from {shop_name}. If you'd like to share your thoughts, we'd love your review. It helps others and only takes a minute!",
    button: "Write a review",
  },
  reply: {
    subject: "{first_name}, your review just got a reply",
    preheader: "{shop_name} replied to your recent review.",
    heading: "Your review got a reply!",
    body: "Hi {first_name},\n\nThanks for leaving a review for {product_title}. Your review:",
    replyLabel: "Here's the reply from {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, please confirm your review",
    preheader: "Confirm it was you who wrote the review.",
    heading: "Please confirm your review",
    body: "Hi {first_name},\n\nThanks for submitting your review for {product_title}. To help keep our reviews authentic and useful for other shoppers, please confirm that it was you who wrote it.\n\nYour review:",
    button: "Confirm my review",
  },
  footerAsked: "You received this because you asked a question on {shop_name}.",
  answer: {
    subject: "{first_name}, your question got an answer",
    preheader: "{shop_name} answered your question about {product_title}.",
    heading: "Your question got an answer",
    body: "Hi {first_name},\n\nThanks for asking about {product_title}. Here's your question and our answer.",
    questionLabel: "Your question:",
    answerLabel: "Answer from {shop_name}:",
  },
  page: {
    heading: "Review your purchase",
    alsoInOrder: "Also in your order:",
    invalidTitle: "This review link isn't valid",
    invalidText:
      "It may have expired. You can still leave a review on the product page.",
    continueShopping: "Continue shopping",
  },
};

const fr: EmailStrings = {
  friend: "",
  clickStar: "Cliquez sur une étoile pour laisser un avis",
  outOf5: "{rating} sur 5",
  contactLine:
    "Si vous avez rencontré un problème avec votre achat, dites-le-nous — nous sommes là pour vous aider.",
  contactLink: "Contactez-nous.",
  footerOrdered:
    "Vous recevez cet e-mail car vous avez commandé chez {shop_name}.",
  footerReviewed:
    "Vous recevez cet e-mail car vous avez donné votre avis sur un produit de {shop_name}.",
  footerReviewLeft:
    "Vous recevez cet e-mail car vous avez laissé un avis sur {shop_name}.",
  unsubscribeRequests: "Se désabonner des demandes d’avis",
  unsubscribeOther: "Se désabonner de ces e-mails",
  signOff: "Merci ! — L’équipe {shop_name}",
  initial: {
    subject: "{first_name}, que pensez-vous de votre commande {order_name} ?",
    preheader: "Votre avis sur votre récente commande nous intéresse",
    heading: "Dites-nous ce que vous en pensez",
    body: "Bonjour {first_name},\n\nNous espérons que votre commande chez {shop_name} vous plaît. Si vous avez un avis sur votre achat, nous serions ravis de le connaître. Vos retours nous aident, ainsi que les futurs clients. Cela ne prend qu’une minute !",
    button: "Écrire un avis",
  },
  reminder: {
    subject: "{first_name}, un petit rappel",
    preheader: "Votre avis sur votre récente commande compte pour nous",
    heading: "Un avis rapide nous aide, ainsi que les autres clients",
    body: "Bonjour {first_name},\n\nNous voulions savoir ce que vous pensez de votre achat chez {shop_name}. Si vous souhaitez partager votre avis, nous serions ravis de le lire. Cela aide les autres clients et ne prend qu’une minute !",
    button: "Écrire un avis",
  },
  reply: {
    subject: "{first_name}, votre avis a reçu une réponse",
    preheader: "{shop_name} a répondu à votre avis récent.",
    heading: "Votre avis a reçu une réponse !",
    body: "Bonjour {first_name},\n\nMerci d’avoir laissé un avis sur {product_title}. Votre avis :",
    replyLabel: "Voici la réponse de {shop_name} :",
  },
  confirm: {
    subject: "{first_name}, veuillez confirmer votre avis",
    preheader: "Confirmez que c’est bien vous qui avez écrit cet avis.",
    heading: "Veuillez confirmer votre avis",
    body: "Bonjour {first_name},\n\nMerci d’avoir publié votre avis sur {product_title}. Pour que nos avis restent authentiques et utiles aux autres clients, veuillez confirmer que c’est bien vous qui l’avez écrit.\n\nVotre avis :",
    button: "Confirmer mon avis",
  },
  footerAsked: "Vous recevez cet e-mail car vous avez posé une question sur {shop_name}.",
  answer: {
    subject: "{first_name}, votre question a reçu une réponse",
    preheader: "{shop_name} a répondu à votre question sur {product_title}.",
    heading: "Votre question a reçu une réponse",
    body: "Bonjour {first_name},\n\nMerci pour votre question sur {product_title}. Voici votre question et notre réponse.",
    questionLabel: "Votre question :",
    answerLabel: "Réponse de {shop_name} :",
  },
  page: {
    heading: "Donnez votre avis sur votre achat",
    alsoInOrder: "Également dans votre commande :",
    invalidTitle: "Ce lien d’avis n’est pas valide",
    invalidText:
      "Il a peut-être expiré. Vous pouvez toujours laisser un avis sur la page du produit.",
    continueShopping: "Continuer vos achats",
  },
};

const de: EmailStrings = {
  friend: "",
  clickStar: "Klicke auf einen Stern, um eine Bewertung abzugeben",
  outOf5: "{rating} von 5",
  contactLine:
    "Gab es Probleme mit deinem Kauf? Sag uns Bescheid — wir helfen gerne.",
  contactLink: "Kontaktiere uns.",
  footerOrdered:
    "Du erhältst diese E-Mail, weil du bei {shop_name} bestellt hast.",
  footerReviewed:
    "Du erhältst diese E-Mail, weil du ein Produkt von {shop_name} bewertet hast.",
  footerReviewLeft:
    "Du erhältst diese E-Mail, weil du eine Bewertung bei {shop_name} abgegeben hast.",
  unsubscribeRequests: "Von Bewertungsanfragen abmelden",
  unsubscribeOther: "Von diesen E-Mails abmelden",
  signOff: "Danke! — Dein {shop_name} Team",
  initial: {
    subject: "{first_name}, wie gefällt dir deine Bestellung {order_name}?",
    preheader: "Wir freuen uns über dein Feedback zu deiner Bestellung",
    heading: "Sag uns deine Meinung",
    body: "Hallo {first_name},\n\nwir hoffen, deine Bestellung von {shop_name} gefällt dir. Wenn du Gedanken zu deinem Kauf hast, würden wir sie gerne hören. Dein Feedback hilft uns und zukünftigen Kund:innen. Es dauert nur eine Minute!",
    button: "Bewertung schreiben",
  },
  reminder: {
    subject: "{first_name}, eine kurze Erinnerung",
    preheader: "Wir würden uns über dein Feedback zu deiner Bestellung freuen",
    heading: "Eine kurze Bewertung hilft uns und anderen",
    body: "Hallo {first_name},\n\nwir wollten nachfragen, wie zufrieden du mit deinem Kauf bei {shop_name} bist. Wenn du deine Meinung teilen möchtest, freuen wir uns über deine Bewertung. Sie hilft anderen und dauert nur eine Minute!",
    button: "Bewertung schreiben",
  },
  reply: {
    subject: "{first_name}, deine Bewertung hat eine Antwort erhalten",
    preheader: "{shop_name} hat auf deine Bewertung geantwortet.",
    heading: "Deine Bewertung hat eine Antwort!",
    body: "Hallo {first_name},\n\ndanke für deine Bewertung zu {product_title}. Deine Bewertung:",
    replyLabel: "Die Antwort von {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, bitte bestätige deine Bewertung",
    preheader: "Bestätige, dass du die Bewertung geschrieben hast.",
    heading: "Bitte bestätige deine Bewertung",
    body: "Hallo {first_name},\n\ndanke für deine Bewertung zu {product_title}. Damit unsere Bewertungen echt und hilfreich für andere Kund:innen bleiben, bestätige bitte, dass du sie geschrieben hast.\n\nDeine Bewertung:",
    button: "Bewertung bestätigen",
  },
  footerAsked: "Du erhältst diese E-Mail, weil du bei {shop_name} eine Frage gestellt hast.",
  answer: {
    subject: "{first_name}, deine Frage wurde beantwortet",
    preheader: "{shop_name} hat deine Frage zu {product_title} beantwortet.",
    heading: "Deine Frage wurde beantwortet",
    body: "Hallo {first_name},\n\ndanke für deine Frage zu {product_title}. Hier sind deine Frage und unsere Antwort.",
    questionLabel: "Deine Frage:",
    answerLabel: "Antwort von {shop_name}:",
  },
  page: {
    heading: "Bewerte deinen Kauf",
    alsoInOrder: "Ebenfalls in deiner Bestellung:",
    invalidTitle: "Dieser Bewertungslink ist ungültig",
    invalidText:
      "Er ist möglicherweise abgelaufen. Du kannst trotzdem auf der Produktseite eine Bewertung abgeben.",
    continueShopping: "Weiter einkaufen",
  },
};

const es: EmailStrings = {
  friend: "",
  clickStar: "Haz clic en una estrella para dejar una reseña",
  outOf5: "{rating} de 5",
  contactLine:
    "Si hubo algún problema con tu compra, avísanos — estamos aquí para ayudarte.",
  contactLink: "Contáctanos.",
  footerOrdered: "Recibes este correo porque hiciste un pedido en {shop_name}.",
  footerReviewed:
    "Recibes este correo porque escribiste una reseña de un producto de {shop_name}.",
  footerReviewLeft:
    "Recibes este correo porque dejaste una reseña en {shop_name}.",
  unsubscribeRequests: "Darse de baja de las solicitudes de reseñas",
  unsubscribeOther: "Darse de baja de estos correos",
  signOff: "¡Gracias! — El equipo de {shop_name}",
  initial: {
    subject: "{first_name}, ¿qué tal tu pedido {order_name}?",
    preheader: "Nos encantaría conocer tu opinión sobre tu pedido",
    heading: "Cuéntanos qué te parece",
    body: "Hola {first_name}:\n\nEsperamos que estés disfrutando de tu pedido de {shop_name}. Si tienes alguna opinión sobre tu compra, nos encantaría conocerla. Tus comentarios nos ayudan a nosotros y a futuros compradores. ¡Solo te llevará un minuto!",
    button: "Escribir una reseña",
  },
  reminder: {
    subject: "{first_name}, un breve recordatorio",
    preheader: "Agradeceríamos tu opinión sobre tu pedido reciente",
    heading: "Una reseña rápida nos ayuda a nosotros y a otros compradores",
    body: "Hola {first_name}:\n\nQueríamos saber qué tal va tu compra en {shop_name}. Si quieres compartir tu opinión, nos encantaría leer tu reseña. Ayuda a otros y solo te llevará un minuto.",
    button: "Escribir una reseña",
  },
  reply: {
    subject: "{first_name}, tu reseña ha recibido una respuesta",
    preheader: "{shop_name} respondió a tu reseña reciente.",
    heading: "¡Tu reseña ha recibido una respuesta!",
    body: "Hola {first_name}:\n\nGracias por dejar una reseña de {product_title}. Tu reseña:",
    replyLabel: "Esta es la respuesta de {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, confirma tu reseña",
    preheader: "Confirma que fuiste tú quien escribió la reseña.",
    heading: "Confirma tu reseña",
    body: "Hola {first_name}:\n\nGracias por enviar tu reseña de {product_title}. Para que nuestras reseñas sigan siendo auténticas y útiles para otros compradores, confirma que fuiste tú quien la escribió.\n\nTu reseña:",
    button: "Confirmar mi reseña",
  },
  footerAsked: "Recibes este correo porque hiciste una pregunta en {shop_name}.",
  answer: {
    subject: "{first_name}, tu pregunta tiene respuesta",
    preheader: "{shop_name} respondió tu pregunta sobre {product_title}.",
    heading: "Tu pregunta tiene respuesta",
    body: "Hola {first_name}:\n\nGracias por preguntar sobre {product_title}. Aquí tienes tu pregunta y nuestra respuesta.",
    questionLabel: "Tu pregunta:",
    answerLabel: "Respuesta de {shop_name}:",
  },
  page: {
    heading: "Valora tu compra",
    alsoInOrder: "También en tu pedido:",
    invalidTitle: "Este enlace de reseña no es válido",
    invalidText:
      "Puede que haya caducado. Aún puedes dejar una reseña en la página del producto.",
    continueShopping: "Seguir comprando",
  },
};

const it: EmailStrings = {
  friend: "",
  clickStar: "Fai clic su una stella per lasciare una recensione",
  outOf5: "{rating} su 5",
  contactLine:
    "Se hai avuto problemi con il tuo acquisto, faccelo sapere — siamo qui per aiutarti.",
  contactLink: "Contattaci.",
  footerOrdered:
    "Ricevi questa email perché hai effettuato un ordine su {shop_name}.",
  footerReviewed:
    "Ricevi questa email perché hai recensito un prodotto di {shop_name}.",
  footerReviewLeft:
    "Ricevi questa email perché hai lasciato una recensione su {shop_name}.",
  unsubscribeRequests: "Annulla l’iscrizione alle richieste di recensione",
  unsubscribeOther: "Annulla l’iscrizione a queste email",
  signOff: "Grazie! — Il team di {shop_name}",
  initial: {
    subject: "{first_name}, com’è andato il tuo ordine {order_name}?",
    preheader: "Ci piacerebbe avere il tuo parere sul tuo ordine",
    heading: "Facci sapere cosa ne pensi",
    body: "Ciao {first_name},\n\nci auguriamo che il tuo ordine da {shop_name} ti stia piacendo. Se hai qualche impressione sul tuo acquisto, ci piacerebbe conoscerla. Il tuo feedback aiuta noi e i futuri clienti. Ci vuole solo un minuto!",
    button: "Scrivi una recensione",
  },
  reminder: {
    subject: "{first_name}, un breve promemoria",
    preheader: "Apprezzeremmo il tuo parere sul tuo ordine recente",
    heading: "Una breve recensione aiuta noi e gli altri clienti",
    body: "Ciao {first_name},\n\nvolevamo sapere come ti trovi con il tuo acquisto da {shop_name}. Se vuoi condividere la tua opinione, ci piacerebbe leggere la tua recensione. Aiuta gli altri e richiede solo un minuto!",
    button: "Scrivi una recensione",
  },
  reply: {
    subject: "{first_name}, la tua recensione ha ricevuto una risposta",
    preheader: "{shop_name} ha risposto alla tua recensione.",
    heading: "La tua recensione ha ricevuto una risposta!",
    body: "Ciao {first_name},\n\ngrazie per aver lasciato una recensione su {product_title}. La tua recensione:",
    replyLabel: "Ecco la risposta di {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, conferma la tua recensione",
    preheader: "Conferma di essere stato tu a scrivere la recensione.",
    heading: "Conferma la tua recensione",
    body: "Ciao {first_name},\n\ngrazie per aver inviato la tua recensione su {product_title}. Per mantenere le nostre recensioni autentiche e utili per gli altri clienti, conferma di essere stato tu a scriverla.\n\nLa tua recensione:",
    button: "Conferma la mia recensione",
  },
  footerAsked: "Ricevi questa email perché hai fatto una domanda su {shop_name}.",
  answer: {
    subject: "{first_name}, la tua domanda ha ricevuto una risposta",
    preheader: "{shop_name} ha risposto alla tua domanda su {product_title}.",
    heading: "La tua domanda ha ricevuto una risposta",
    body: "Ciao {first_name},\n\ngrazie per la tua domanda su {product_title}. Ecco la tua domanda e la nostra risposta.",
    questionLabel: "La tua domanda:",
    answerLabel: "Risposta di {shop_name}:",
  },
  page: {
    heading: "Recensisci il tuo acquisto",
    alsoInOrder: "Nel tuo ordine anche:",
    invalidTitle: "Questo link per la recensione non è valido",
    invalidText:
      "Potrebbe essere scaduto. Puoi comunque lasciare una recensione nella pagina del prodotto.",
    continueShopping: "Continua lo shopping",
  },
};

const nl: EmailStrings = {
  friend: "",
  clickStar: "Klik op een ster om een review te schrijven",
  outOf5: "{rating} van 5",
  contactLine:
    "Was er een probleem met je aankoop? Laat het ons weten — we helpen je graag.",
  contactLink: "Neem contact met ons op.",
  footerOrdered:
    "Je ontvangt deze e-mail omdat je hebt besteld bij {shop_name}.",
  footerReviewed:
    "Je ontvangt deze e-mail omdat je een product van {shop_name} hebt beoordeeld.",
  footerReviewLeft:
    "Je ontvangt deze e-mail omdat je een review hebt geschreven bij {shop_name}.",
  unsubscribeRequests: "Afmelden voor reviewverzoeken",
  unsubscribeOther: "Afmelden voor deze e-mails",
  signOff: "Bedankt! — Het team van {shop_name}",
  initial: {
    subject: "{first_name}, hoe bevalt je bestelling {order_name}?",
    preheader: "We horen graag wat je van je bestelling vindt",
    heading: "Laat ons weten wat je ervan vindt",
    body: "Hoi {first_name},\n\nWe hopen dat je blij bent met je bestelling bij {shop_name}. Als je iets over je aankoop wilt delen, horen we het graag. Je feedback helpt ons en toekomstige klanten. Het kost maar een minuutje!",
    button: "Review schrijven",
  },
  reminder: {
    subject: "{first_name}, een korte herinnering",
    preheader: "We stellen je feedback op je recente bestelling erg op prijs",
    heading: "Een korte review helpt ons en andere shoppers",
    body: "Hoi {first_name},\n\nWe zijn benieuwd hoe het gaat met je aankoop bij {shop_name}. Als je je mening wilt delen, lezen we graag je review. Het helpt anderen en kost maar een minuutje!",
    button: "Review schrijven",
  },
  reply: {
    subject: "{first_name}, je review heeft een reactie gekregen",
    preheader: "{shop_name} heeft gereageerd op je review.",
    heading: "Je review heeft een reactie!",
    body: "Hoi {first_name},\n\nBedankt voor je review van {product_title}. Je review:",
    replyLabel: "Dit is de reactie van {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, bevestig je review",
    preheader: "Bevestig dat jij deze review hebt geschreven.",
    heading: "Bevestig je review",
    body: "Hoi {first_name},\n\nBedankt voor je review van {product_title}. Om onze reviews echt en nuttig te houden voor andere klanten, vragen we je te bevestigen dat jij de review hebt geschreven.\n\nJe review:",
    button: "Mijn review bevestigen",
  },
  footerAsked: "Je ontvangt deze e-mail omdat je een vraag hebt gesteld bij {shop_name}.",
  answer: {
    subject: "{first_name}, je vraag is beantwoord",
    preheader: "{shop_name} heeft je vraag over {product_title} beantwoord.",
    heading: "Je vraag is beantwoord",
    body: "Hoi {first_name},\n\nBedankt voor je vraag over {product_title}. Hier zijn je vraag en ons antwoord.",
    questionLabel: "Je vraag:",
    answerLabel: "Antwoord van {shop_name}:",
  },
  page: {
    heading: "Beoordeel je aankoop",
    alsoInOrder: "Ook in je bestelling:",
    invalidTitle: "Deze reviewlink is niet geldig",
    invalidText:
      "Hij is mogelijk verlopen. Je kunt nog steeds een review schrijven op de productpagina.",
    continueShopping: "Verder winkelen",
  },
};

const ptBR: EmailStrings = {
  friend: "",
  clickStar: "Clique em uma estrela para deixar uma avaliação",
  outOf5: "{rating} de 5",
  contactLine:
    "Se houve algum problema com sua compra, avise-nos — estamos aqui para ajudar.",
  contactLink: "Fale conosco.",
  footerOrdered:
    "Você recebeu este e-mail porque fez um pedido em {shop_name}.",
  footerReviewed:
    "Você recebeu este e-mail porque avaliou um produto de {shop_name}.",
  footerReviewLeft:
    "Você recebeu este e-mail porque deixou uma avaliação em {shop_name}.",
  unsubscribeRequests: "Cancelar inscrição dos pedidos de avaliação",
  unsubscribeOther: "Cancelar inscrição destes e-mails",
  signOff: "Obrigado! — Equipe {shop_name}",
  initial: {
    subject: "{first_name}, como foi seu pedido {order_name}?",
    preheader: "Adoraríamos saber sua opinião sobre seu pedido",
    heading: "Conte para nós o que achou",
    body: "Olá, {first_name}!\n\nEsperamos que você esteja gostando do seu pedido da {shop_name}. Se tiver alguma opinião sobre sua compra, adoraríamos saber. Seu feedback ajuda a nós e a futuros compradores. Leva só um minuto!",
    button: "Escrever uma avaliação",
  },
  reminder: {
    subject: "{first_name}, só um lembrete rápido",
    preheader: "Gostaríamos muito da sua opinião sobre seu pedido recente",
    heading: "Uma avaliação rápida ajuda a nós e a outros compradores",
    body: "Olá, {first_name}!\n\nQueríamos saber como está sua experiência com a compra na {shop_name}. Se quiser compartilhar sua opinião, adoraríamos ler sua avaliação. Ela ajuda outras pessoas e leva só um minuto!",
    button: "Escrever uma avaliação",
  },
  reply: {
    subject: "{first_name}, sua avaliação recebeu uma resposta",
    preheader: "{shop_name} respondeu à sua avaliação recente.",
    heading: "Sua avaliação recebeu uma resposta!",
    body: "Olá, {first_name}!\n\nObrigado por avaliar {product_title}. Sua avaliação:",
    replyLabel: "Esta é a resposta de {shop_name}:",
  },
  confirm: {
    subject: "{first_name}, confirme sua avaliação",
    preheader: "Confirme que foi você quem escreveu a avaliação.",
    heading: "Confirme sua avaliação",
    body: "Olá, {first_name}!\n\nObrigado por enviar sua avaliação de {product_title}. Para manter nossas avaliações autênticas e úteis para outros compradores, confirme que foi você quem a escreveu.\n\nSua avaliação:",
    button: "Confirmar minha avaliação",
  },
  footerAsked: "Você recebeu este e-mail porque fez uma pergunta em {shop_name}.",
  answer: {
    subject: "{first_name}, sua pergunta foi respondida",
    preheader: "{shop_name} respondeu sua pergunta sobre {product_title}.",
    heading: "Sua pergunta foi respondida",
    body: "Olá, {first_name}!\n\nObrigado por perguntar sobre {product_title}. Veja sua pergunta e nossa resposta.",
    questionLabel: "Sua pergunta:",
    answerLabel: "Resposta de {shop_name}:",
  },
  page: {
    heading: "Avalie sua compra",
    alsoInOrder: "Também no seu pedido:",
    invalidTitle: "Este link de avaliação não é válido",
    invalidText:
      "Ele pode ter expirado. Você ainda pode deixar uma avaliação na página do produto.",
    continueShopping: "Continuar comprando",
  },
};

export const WESTERN = { en, fr, de, es, it, nl, "pt-BR": ptBR };
