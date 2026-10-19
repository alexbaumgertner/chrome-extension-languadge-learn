# Model judge report

- Date: 2026-10-19T11:24:19.877Z
- Judge: `gemini-3.1-pro-preview` (blind, shuffled letters; same model family as candidates — spot-check)
- Paragraphs: 20

| Model | Overall | Meaning | Grammar | Level fit | Glosses | $/paragraph | Avg latency | Judged |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `gemini-3.8-flash` | 4.86 | 4.80 | 4.85 | 5.00 | 4.80 | 0.00116 | 3149 ms | 20/20 |
| `gemini-3.6-flash` | 4.61 | 4.65 | 4.30 | 4.90 | 4.60 | 0.00088 | 2131 ms | 20/20 |
| `gemini-3.1-flash-lite` | 4.30 | 3.95 | 4.35 | 4.75 | 4.15 | 0.00039 | 1343 ms | 20/20 |
| `gemini-3.5-flash-lite` | 4.15 | 3.90 | 4.15 | 4.50 | 4.05 | 0.00065 | 1217 ms | 20/20 |

## 1. news · A1-A2

> В понедельник в Германии снова бастуют машинисты поездов. Профсоюз GDL призвал своих членов прекратить работу с двух часов ночи до вечера вторника. Deutsche Bahn советует пассажирам по возможности перенести поездки и заранее проверять расписание в приложении.

**gemini-3.6-flash** (shown as A)

Am Montag streiken in Deutschland wieder die Lokführer. Die Gewerkschaft GDL ruft ihre Mitglieder zum Streik auf. Der Streik dauert von zwei Uhr nachts bis Dienstagabend. Die Deutsche Bahn gibt einen Tipp: Passagiere sollen ihre Reisen verschieben. Sie können den Fahrplan vorher in der App prüfen.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.8-flash** (shown as B)

Am Montag streiken in Deutschland wieder die Lokführer. Die Gewerkschaft GDL ruft ihre Mitglieder zum Streik auf. Die Arbeit stoppt von zwei Uhr nachts bis Dienstagabend. Die Deutsche Bahn rät den Fahrgästen: Verschieben Sie Ihre Reisen. Prüfen Sie den Fahrplan vorher in der App.

meaning 5 · grammar 4 · level 5 · glosses 5
- "Die Arbeit stoppt" is a bit unnatural in German for a strike (usually "die Arbeit ruht" or "sie legen die Arbeit nieder"), though understandable.

**gemini-3.5-flash-lite** (shown as C)

Am Montag streiken die Lokführer in Deutschland wieder. Die Gewerkschaft GDL ruft zur Arbeitspause auf. Die Pause beginnt um zwei Uhr nachts und endet am Dienstagabend. Die Deutsche Bahn rät den Fahrgästen: Verschieben Sie Ihre Reise. Oder prüfen Sie den Fahrplan in der App.

meaning 2 · grammar 5 · level 5 · glosses 3
- "Arbeitspause" means a regular work break (like a lunch break), which distorts the meaning of a strike.
- "Oder" (or) changes the meaning of the source text, which says "и" (and) to check the schedule.

**gemini-3.1-flash-lite** (shown as D)

Am Montag gibt es in Deutschland wieder einen Streik bei der Bahn. Die Gewerkschaft GDL sagt: Die Lokführer arbeiten nicht. Das dauert von Dienstagnacht bis Dienstagabend. Die Deutsche Bahn gibt einen Rat: Reisende sollen ihre Fahrten verschieben. Bitte prüfen Sie das Fahrplan im Internet.

meaning 2 · grammar 3 · level 5 · glosses 2
- "das Fahrplan" is grammatically incorrect; it must be "den Fahrplan" (der Fahrplan).
- "im Internet" is a mistranslation of "в приложении" (in der App).
- "Dienstagnacht" distorts the starting time "с двух часов ночи" (2 AM Monday night).

## 2. news · B1-B2

> Бундестаг принял закон, который упрощает получение гражданства. Теперь подать заявление можно уже через пять лет проживания в стране, а при особых успехах в интеграции — через три года. Кроме того, двойное гражданство больше не будет исключением: новым гражданам не придётся отказываться от прежнего паспорта.

**gemini-3.6-flash** (shown as A)

Der Bundestag hat ein Gesetz beschlossen, das den Erwerb der Staatsbürgerschaft erleichtert. Nun kann man einen Antrag bereits nach fünf Jahren Aufenthalt im Land stellen, und bei besonderen Integrationsleistungen sogar schon nach drei Jahren. Außerdem wird die doppelte Staatsbürgerschaft kein Ausnahmefall mehr sein: Neue Staatsbürger müssen ihren bisherigen Pass nicht mehr abgeben.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.1-flash-lite** (shown as B)

Der Bundestag hat ein Gesetz verabschiedet, das den Erwerb der Staatsbürgerschaft vereinfacht. Man kann den Antrag nun bereits nach fünf Jahren Aufenthalt im Land stellen, bei besonderen Integrationsleistungen sogar schon nach drei Jahren. Außerdem ist die doppelte Staatsbürgerschaft künftig kein Ausnahmefall mehr: Neue Bürger müssen ihren alten Pass nicht mehr abgeben.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.8-flash** (shown as C)

Der Bundestag hat ein Gesetz beschlossen, das die Einbürgerung vereinfacht. Ab jetzt kann man den Antrag schon nach fünf Jahren Aufenthalt im Land stellen, und bei besonderen Integrationsleistungen sogar nach drei Jahren. Außerdem wird die doppelte Staatsbürgerschaft keine Ausnahme mehr sein: Neue Staatsbürger müssen ihren bisherigen Pass nicht mehr abgeben.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.5-flash-lite** (shown as D)

Der Bundestag hat ein Gesetz angenommen, das den Erwerb der Staatsbürgerschaft erleichtert. Jetzt kann man den Antrag schon nach fünf Jahren Aufenthalt im Land stellen, und bei besonderen Integrationsleistungen sogar nach drei Jahren. Außerdem ist die doppelte Staatsbürgerschaft künftig keine Ausnahme mehr: Neue Bürger müssen ihren alten Pass nicht mehr abgeben.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 3. news · A1-A2

> С января стоимость проездного Deutschlandticket выросла до 63 евро в месяц. Билет по-прежнему действует во всех автобусах, трамваях и региональных поездах по всей стране. Скоростные поезда ICE и IC в него не входят.

**gemini-3.1-flash-lite** (shown as A)

Das Deutschlandticket kostet seit Januar 63 Euro pro Monat. Der Ticket gilt in allen Bussen, Straßenbahnen und Regionalzügen in ganz Deutschland. Aber man darf damit nicht mit den schnellen ICE- oder IC-Zügen fahren.

meaning 4 · grammar 3 · level 4 · glosses 3
- Falscher Artikel: Es muss 'Das Ticket' heißen, nicht 'Der Ticket'.

**gemini-3.6-flash** (shown as B)

Seit Januar kostet das Deutschlandticket 63 Euro pro Monat. Der Preis ist gestiegen. Das Ticket gilt weiter in allen Bussen, Straßenbahnen und Regionalzügen in ganz Deutschland. Schnelle Züge wie ICE und IC gehören nicht dazu.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.8-flash** (shown as C)

Seit Januar kostet das Deutschlandticket 63 Euro im Monat. Der Preis ist gestiegen. Die Fahrkarte gilt weiter in ganz Deutschland. Man kann damit alle Busse, Straßenbahnen und Regionalzüge nutzen. Schnelle Züge wie der ICE oder der IC gehören nicht dazu.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.5-flash-lite** (shown as D)

Ab Januar kostet das Deutschlandticket 63 Euro im Monat. Der Ticket gilt weiter in allen Bussen, Trams und Regionalzügen in ganz Deutschland. Die schnellen Züge ICE und IC sind nicht dabei.

meaning 4 · grammar 3 · level 4 · glosses 4
- Falscher Artikel: 'Der Ticket' statt 'Das Ticket'.

## 4. news · B1-B2

> Арендная плата в крупных немецких городах продолжает расти. По данным исследовательского института, за последний год средняя цена квадратного метра в Мюнхене поднялась почти на семь процентов. Эксперты связывают это с нехваткой нового жилья и высокими процентными ставками, из-за которых многие откладывают покупку квартиры.

**gemini-3.8-flash** (shown as A)

Die Mieten in großen deutschen Städten steigen immer weiter. Nach Angaben eines Forschungsinstituts ist der durchschnittliche Quadratmeterpreis in München im vergangenen Jahr um fast sieben Prozent gestiegen. Experten führen das auf den Mangel an neuem Wohnraum und auf die hohen Zinsen zurück, wegen derer viele Menschen den Kauf einer Wohnung verschieben.

meaning 5 · grammar 5 · level 5 · glosses 3
- The gloss 'führen das auf' is incomplete because it misses the separable prefix 'zurück' from the verb 'zurückführen auf'.

**gemini-3.5-flash-lite** (shown as B)

Die Mieten in großen deutschen Städten steigen weiter. Laut einem Forschungsinstitut stieg der durchschnittliche Preis pro Quadratmeter in München im vergangenen Jahr um fast sieben Prozent. Experten führen das auf den Mangel an neuem Wohnraum und hohe Zinsen zurück, weshalb viele den Kauf einer Wohnung aufschieben.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.6-flash** (shown as C)

Die Mieten in den deutschen Großstädten steigen weiter an. Laut einem Forschungsinstitut ist der durchschnittliche Preis pro Quadratmeter in München im letzten Jahr um fast sieben Prozent gestiegen. Experten führen dies auf den Mangel an neuem Wohnraum und die hohen Zinsen zurück, wegen derer viele den Kauf einer Wohnung verschieben.

meaning 5 · grammar 5 · level 5 · glosses 3
- The gloss 'führen dies auf' is incomplete because it misses the separable prefix 'zurück' from the verb 'zurückführen auf'.

**gemini-3.1-flash-lite** (shown as D)

Die Mieten in großen deutschen Städten steigen weiter an. Laut einem Forschungsinstitut ist der durchschnittliche Preis pro Quadratmeter in München im letzten Jahr um fast sieben Prozent gestiegen. Experten führen das auf den Mangel an neuem Wohnraum und die hohen Zinsen zurück, weshalb viele Menschen den Kauf einer Wohnung aufschieben.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 5. news · A1-A2

> Метеорологи предупреждают о сильной жаре на юге Германии. В выходные температура может подняться до 36 градусов. Врачи советуют пить больше воды, не выходить на солнце в обед и чаще проведывать пожилых соседей.

**gemini-3.6-flash** (shown as A)

Meteo-Experten warnen vor großer Hitze im Süden von Deutschland. Am Wochenende kann die Temperatur bis auf 36 Grad steigen. Ärzte raten: Trinken Sie viel Wasser! Gehen Sie am Mittag nicht in die Sonne! Und besuchen Sie oft ältere Nachbarn!

meaning 4 · grammar 4 · level 5 · glosses 5
- "Meteo-Experten" is an unnatural coinage; "Meteorologen" or "Wetterexperten" should be used.

**gemini-3.1-flash-lite** (shown as B)

Meteorologen warnen vor starker Hitze im Süden von Deutschland. Am Wochenende ist es sehr heiß. Die Temperatur steigt bis zu 36 Grad. Ärzte geben Tipps: Trinken Sie viel Wasser. Gehen Sie am Mittag nicht in die Sonne. Besuchen Sie oft Ihre alten Nachbarn.

meaning 4 · grammar 3 · level 5 · glosses 5
- "steigt bis zu 36 Grad" is missing a preposition (should be "steigt auf bis zu 36 Grad").
- "alten Nachbarn" is less polite than "ältere Nachbarn" and incorrectly translates "пожилых".

**gemini-3.5-flash-lite** (shown as C)

Es wird sehr heiß in Süddeutschland. Am Wochenende haben wir bis zu 36 Grad. Ärzte raten: Trinken Sie viel Wasser! Gehen Sie in der Mittagszeit nicht in die Sonne! Helfen Sie auch älteren Nachbarn!

meaning 2 · grammar 5 · level 5 · glosses 5
- Omitted the fact that meteorologists are warning ("Метеорологи предупреждают").
- Changed visiting to helping ("Helfen Sie" instead of "Besuchen Sie").

**gemini-3.8-flash** (shown as D)

Meteorologen warnen vor großer Hitze im Süden von Deutschland. Am Wochenende kann die Temperatur bis auf 36 Grad steigen. Ärzte raten: Trinken Sie mehr Wasser. Gehen Sie am Mittag nicht in die Sonne. Besuchen Sie auch öfter ältere Nachbarn.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 6. news · B1-B2

> Федеральное агентство по труду сообщило, что число открытых вакансий для специалистов в сфере ухода за больными снова увеличилось. Особенно не хватает медсестёр в домах престарелых. Правительство надеется привлечь больше работников из-за рубежа и ускорить признание иностранных дипломов.

**gemini-3.8-flash** (shown as A)

Die Bundesagentur für Arbeit hat mitgeteilt, dass die Zahl der offenen Stellen für Pflegekräfte wieder gestiegen ist. Besonders in Altenheimen fehlen viele Fachkräfte. Die Regierung hofft nun, mehr Arbeitskräfte aus dem Ausland anzuwerben und die Anerkennung ausländischer Abschlüsse zu beschleunigen.

meaning 4 · grammar 5 · level 5 · glosses 5
- Translates 'медсестёр' (nurses) too generally as 'viele Fachkräfte'.
- Adds the word 'nun', which has no equivalent in the source text.

**gemini-3.6-flash** (shown as B)

Die Bundesagentur für Arbeit hat mitgeteilt, dass die Zahl der offenen Stellen für Pflegefachkräfte wieder gestiegen ist. Besonders in Altenheimen fehlen Krankenschwestern und Pfleger. Die Regierung hofft, mehr Arbeitskräfte aus dem Ausland anzulocken und die Anerkennung ausländischer Diplome zu beschleunigen.

meaning 5 · grammar 3 · level 5 · glosses 4
- The verb 'anzulocken' is the wrong register; it means 'to lure/entice' and sounds unprofessional here. Better: 'anwerben' or 'gewinnen'.

**gemini-3.1-flash-lite** (shown as C)

Die Bundesagentur für Arbeit hat mitgeteilt, dass die Zahl der offenen Stellen für Fachkräfte in der Krankenpflege wieder gestiegen ist. Besonders in Pflegeheimen fehlen dringend Pflegekräfte. Die Regierung hofft, mehr Arbeitskräfte aus dem Ausland zu gewinnen und die Anerkennung ausländischer Diplome zu beschleunigen.

meaning 4 · grammar 4 · level 5 · glosses 4
- Adds 'dringend' which is not present in the source.
- 'Diplome' usually refers to specific academic degrees in German; 'Abschlüsse' is the correct term for general professional qualifications.
- The gloss for 'Pflegeheimen' (dative) is given as 'дома' (nominative) instead of 'домах'.

**gemini-3.5-flash-lite** (shown as D)

Die Bundesagentur für Arbeit hat mitgeteilt, dass die Zahl der offenen Stellen für Pflegekräfte wieder gestiegen ist. Vor allem in Seniorenheimen fehlen Pflegekräfte. Die Regierung hofft, mehr Arbeitskräfte aus dem Ausland anzuziehen und die Anerkennung ausländischer Abschlüsse zu beschleunigen.

meaning 5 · grammar 4 · level 5 · glosses 4
- 'Arbeitskräfte anzuziehen' is less idiomatic in this context than 'Arbeitskräfte anzuwerben' or 'zu gewinnen'.
- The gloss for 'Seniorenheimen' (dative) is given as 'дома' (nominative) instead of 'домах'.

## 7. news · A1-A2

> В Берлине открылся новый рождественский рынок у Красной ратуши. Посетители могут покататься на колесе обозрения, попробовать глинтвейн и купить подарки ручной работы. Рынок работает каждый день с полудня до десяти вечера до конца декабря.

**gemini-3.8-flash** (shown as A)

In Berlin gibt es einen neuen Weihnachtsmarkt am Roten Rathaus. Besucher können Riesenrad fahren, Glühwein trinken und handgemachte Geschenke kaufen. Der Markt ist jeden Tag von 12 Uhr bis 22 Uhr geöffnet. Er bleibt bis Ende Dezember offen.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.6-flash** (shown as B)

In Berlin gibt es einen neuen Weihnachtsmarkt am Roten Rathaus. Besucher können auf dem Riesenrad fahren. Sie können Glühwein trinken und handgemachte Geschenke kaufen. Der Markt ist jeden Tag von zwölf bis zweiundzwanzig Uhr geöffnet. Er bleibt bis Ende Dezember da.

meaning 4 · grammar 3 · level 4 · glosses 5
- auf dem Riesenrad fahren
- zweiundzwanzig Uhr

**gemini-3.1-flash-lite** (shown as C)

Ein neuer Weihnachtsmarkt ist in Berlin bei dem Rotes Rathaus offen. Besucher können mit dem Riesenrad fahren. Sie können Glühwein trinken. Man kann auch Geschenke kaufen. Der Markt ist jeden Tag offen. Er ist von Mittag bis zehn Uhr abends offen. Das ist bis Ende Dezember so.

meaning 3 · grammar 2 · level 3 · glosses 4
- bei dem Rotes Rathaus
- omitted handgemachte

**gemini-3.5-flash-lite** (shown as D)

In Berlin gibt es einen neuen Weihnachtsmarkt an dem Roten Rathaus. Die Besucher können Rad fahren, Glühwein trinken und Geschenke kaufen. Der Markt ist jeden Tag offen.

meaning 1 · grammar 1 · level 1 · glosses 1
- Rad fahren
- an dem Roten Rathaus
- missing details like handgemachte, hours, and end of December

## 8. blog · A1-A2

> Сегодня я наконец сделала анмельдунг! Записаться в бюргерамт было сложно: свободных окошек не было три недели. Но сама встреча заняла всего десять минут. Сотрудница была очень вежливой, и я даже смогла сказать пару фраз по-немецки.

**gemini-3.6-flash** (shown as A)

Heute habe ich endlich die Anmeldung gemacht! Die Terminbuchung im Bürgeramt war schwer: Es gab drei Wochen lang keine freien Termine. Aber das Treffen hat nur zehn Minuten gedauert. Die Mitarbeiterin war sehr nett und ich konnte sogar ein paar Sätze auf Deutsch sprechen.

meaning 5 · grammar 4 · level 5 · glosses 5
- The word 'das Treffen' is used for private meetings. For an official appointment at the Bürgeramt, 'der Termin' must be used.

**gemini-3.5-flash-lite** (shown as B)

Heute habe ich endlich die Anmeldung gemacht! Einen Termin im Bürgeramt zu bekommen war schwer. Es gab drei Wochen lang keine freien Termine. Aber der Termin hat nur zehn Minuten gedauert. Die Mitarbeiterin war sehr nett. Ich habe sogar ein paar Sätze auf Deutsch gesagt.

meaning 4 · grammar 5 · level 5 · glosses 4
- 'Ich habe sogar ein paar Sätze auf Deutsch gesagt' translates 'я сказала' rather than 'я смогла сказать' (Ich konnte sagen).
- Nouns in the glosses (Anmeldung, Termin, Mitarbeiterin) lack their definite articles, which are crucial for A1-A2 learners.

**gemini-3.8-flash** (shown as C)

Heute habe ich endlich meine Anmeldung gemacht! Einen Termin beim Bürgeramt zu bekommen, war schwer. Drei Wochen lang gab es keine freien Termine. Aber der Termin selbst hat nur zehn Minuten gedauert. Die Mitarbeiterin war sehr höflich. Ich konnte sogar ein paar Sätze auf Deutsch sagen.

meaning 5 · grammar 5 · level 5 · glosses 4
- Nouns in the glosses (Anmeldung, Termin, Bürgeramt) lack their definite articles, which are essential for A1-A2 learners.

**gemini-3.1-flash-lite** (shown as D)

Heute habe ich endlich meine Anmeldung gemacht. Es war schwer, einen Termin beim Bürgeramt zu finden. Es gab drei Wochen lang keine Termine. Aber der Termin hat nur zehn Minuten gedauert. Die Mitarbeiterin war sehr freundlich. Ich habe sogar ein paar Sätze auf Deutsch gesagt.

meaning 4 · grammar 5 · level 5 · glosses 4
- 'Ich habe sogar ein paar Sätze auf Deutsch gesagt' misses the capability aspect of 'смогла сказать' (konnte sagen).
- 'keine Termine' slightly misses the translation of 'свободных окошек' (keine freien Termine).
- Nouns in the glosses lack their definite articles.

## 9. blog · B1-B2

> Первые полгода в Германии я пыталась жить так же, как дома: искала привычные продукты, смотрела русские сериалы и общалась только с соотечественниками. В какой-то момент поняла, что так язык не выучу никогда. Тогда я записалась в хор при местной церкви — и это лучшее решение за весь год.

**gemini-3.6-flash** (shown as A)

Die ersten sechs Monate in Deutschland habe ich versucht, genauso wie zu Hause zu leben: Ich habe nach gewohnten Lebensmitteln gesucht, russische Serien geschaut und mich nur mit Landsleuten unterhalten. Irgendwann wurde mir klar, dass ich so die Sprache niemals lernen würde. Dann habe ich mich bei einem Chor in der örtlichen Kirche angemeldet – und das war die beste Entscheidung des ganzen Jahres.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.1-flash-lite** (shown as B)

Die ersten sechs Monate in Deutschland habe ich versucht, genauso zu leben wie zu Hause: Ich suchte nach vertrauten Lebensmitteln, schaute russische Serien und unterhielt mich nur mit Landsleuten. Irgendwann wurde mir klar, dass ich auf diese Weise die Sprache niemals lernen würde. Dann habe ich mich bei einem Chor in der örtlichen Kirche angemeldet – und das war die beste Entscheidung des ganzen Jahres.

meaning 5 · grammar 5 · level 5 · glosses 4
- no errors listed

**gemini-3.8-flash** (shown as C)

Das erste halbe Jahr in Deutschland habe ich versucht, genauso wie zu Hause zu leben: Ich suchte nach gewohnten Lebensmitteln, schaute russische Serien und unterhielt mich nur mit Landsleuten. Irgendwann wurde mir klar, dass ich so die Sprache nie lernen würde. Da meldete ich mich im Chor der örtlichen Kirchengemeinde an – und das war die beste Entscheidung des ganzen Jahres.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.5-flash-lite** (shown as D)

Die ersten sechs Monate in Deutschland versuchte ich, genauso zu leben wie zu Hause: Ich suchte nach gewohnten Produkten, sah russische Serien und sprach nur mit Landsleuten. Irgendwann begriff ich, dass ich die Sprache auf diese Weise niemals lernen würde. Dann trat ich einem Chor in der Ortskirche bei - und das war die beste Entscheidung des ganzen Jahres.

meaning 4 · grammar 4 · level 4 · glosses 4
- "Produkten" is an unnatural translation for "продукты" in the sense of food/groceries; "Lebensmitteln" is the correct term.
- "in der Ortskirche" means physically inside the church building, which misses the meaning of "при местной церкви" (affiliated with the local church).

## 10. blog · A1-A2

> В Германии в воскресенье почти все магазины закрыты. Сначала меня это очень удивляло. Теперь я покупаю продукты в субботу, а в воскресенье гуляю в парке или хожу в гости. Оказалось, что один спокойный день в неделю — это очень приятно.

**gemini-3.5-flash-lite** (shown as A)

In Deutschland sind am Sonntag fast alle Geschäfte geschlossen. Das hat mich zuerst sehr gewundert. Jetzt kaufe ich am Samstag ein. Am Sonntag gehe ich in den Park oder zu Freunden. Ich habe gemerkt: Ein ruhiger Tag in der Woche ist sehr schön.

meaning 4 · grammar 5 · level 5 · glosses 5
- "kaufe ich am Samstag ein" omits explicit "продукты" (Lebensmittel), although it is implied.
- "gehe ich in den Park" translates to "go to the park", which loses the specific meaning of "гуляю" (walk).

**gemini-3.8-flash** (shown as B)

In Deutschland sind am Sonntag fast alle Geschäfte geschlossen. Am Anfang hat mich das sehr gewundert. Jetzt kaufe ich Lebensmittel am Samstag. Am Sonntag gehe ich im Park spazieren oder besuche Freunde. Ein ruhiger Tag in der Woche ist wirklich sehr schön.

meaning 4 · grammar 4 · level 5 · glosses 5
- Omitted the translation for the clause "Оказалось, что" (It turned out that).
- Suboptimal word order: "kaufe ich Lebensmittel am Samstag" should ideally be "kaufe ich am Samstag Lebensmittel" following the Time-Manner-Place (Time before Object) rule.

**gemini-3.1-flash-lite** (shown as C)

In Deutschland sind am Sonntag fast alle Geschäfte geschlossen. Zuerst war ich sehr überrascht. Jetzt kaufe ich am Samstag ein. Am Sonntag gehe ich in den Park oder ich besuche Freunde. Ein ruhiger Tag in der Woche ist sehr schön.

meaning 3 · grammar 5 · level 5 · glosses 5
- Omitted the translation for "Оказалось, что".
- Omitted the explicit translation for "продукты".
- "gehe ich in den Park" means "go to the park", losing the meaning of "гуляю в парке" (walk in the park).

**gemini-3.6-flash** (shown as D)

In Deutschland sind am Sonntag fast alle Geschäfte geschlossen. Zuerst hat mich das sehr überrascht. Jetzt kaufe ich Lebensmittel am Samstag. Am Sonntag gehe ich im Park spazieren oder besuche Freunde. Ein ruhiger Tag in der Woche ist sehr angenehm.

meaning 4 · grammar 4 · level 5 · glosses 5
- Omitted the translation for "Оказалось, что".
- Suboptimal word order: "kaufe ich Lebensmittel am Samstag" should ideally be "kaufe ich am Samstag Lebensmittel".

## 11. blog · B1-B2

> Многие жалуются на немецкую бюрократию, но у неё есть и плюсы. Если ты один раз правильно заполнил все формы, дальше система работает предсказуемо: письма приходят вовремя, сроки соблюдаются, а ответ всегда можно получить в письменном виде. Главное — не выбрасывать ни одного письма и завести отдельную папку для документов.

**gemini-3.6-flash** (shown as A)

Viele beschweren sich über die deutsche Bürokrathie, aber sie hat auch ihre Vorteile. Wenn man einmal alle Formulare richtig ausgefüllt hat, läuft das System danach vorhersehbar: Briefe kommen pünktlich an, Fristen werden eingehalten, und man kann eine Antwort immer schriftlich bekommen. Das Wichtigste ist, keinen einzigen Brief wegzuwerfen und einen eigenen Ordner für Dokumente anzulegen.

meaning 5 · grammar 4 · level 5 · glosses 5
- Rechtschreibfehler: "Bürokrathie" statt "Bürokratie".

**gemini-3.1-flash-lite** (shown as B)

Viele Leute beschweren sich über die deutsche Bürokratie, aber sie hat auch ihre Vorteile. Wenn du einmal alle Formulare richtig ausgefüllt hast, funktioniert das System danach absolut vorhersehbar: Briefe kommen pünktlich an, Fristen werden eingehalten und man kann eine Antwort immer schriftlich erhalten. Das Wichtigste ist, keinen einzigen Brief wegzuwerfen und einen eigenen Ordner für die Unterlagen anzulegen.

meaning 4 · grammar 5 · level 5 · glosses 4
- Bedeutungsverschiebung: Das Wort "absolut" in "absolut vorhersehbar" wurde hinzugefügt und steht nicht im russischen Original.
- Glosse: "beschweren sich" (konjugierte Form) wurde mit dem Infinitiv "жаловаться" übersetzt.

**gemini-3.8-flash** (shown as C)

Viele beschweren sich über die deutsche Bürokratie, aber sie hat auch Vorteile. Wenn man alle Formulare einmal richtig ausgefüllt hat, funktioniert das System danach vorhersehbar: Briefe kommen pünktlich an, Fristen werden eingehalten und man bekommt immer eine schriftliche Antwort. Das Wichtigste ist, keinen einzigen Brief wegzuwerfen und einen eigenen Ordner für die Unterlagen anzulegen.

meaning 5 · grammar 5 · level 5 · glosses 4
- Glosse: "eingehalten" wird hier im Präsens Passiv ("werden eingehalten") verwendet, was dem russischen imperfektiven "соблюдаются" entspricht, nicht dem perfektiven/resultativen "соблюдены".

**gemini-3.5-flash-lite** (shown as D)

Viele beschweren sich über die deutsche Bürokratie, aber sie hat auch ihre Vorteile. Wenn man einmal alle Formulare richtig ausgefüllt hat, funktioniert das System danach vorhersehbar: Briefe kommen pünktlich an, Fristen werden eingehalten und eine Antwort bekommt man immer schriftlich. Die Hauptsache ist, keinen einzigen Brief wegzuwerfen und einen separaten Ordner für Dokumente anzulegen.

meaning 5 · grammar 5 · level 5 · glosses 4
- Glosse: "beschweren sich" (konjugierte Form) wurde mit dem Infinitiv "жаловаться" übersetzt.

## 12. blog · A1-A2

> Мой сын пошёл в немецкий детский сад три месяца назад. Первую неделю он плакал каждое утро. Сейчас он рассказывает мне про друзей, поёт немецкие песни и поправляет моё произношение. Дети учат язык намного быстрее, чем взрослые.

**gemini-3.8-flash** (shown as A)

Mein Sohn geht seit drei Monaten in einen deutschen Kindergarten. In der ersten Woche hat er jeden Morgen geweint. Jetzt erzählt er mir von seinen Freunden. Er singt deutsche Lieder und korrigiert meine Aussprache. Kinder lernen eine Sprache viel schneller als Erwachsene.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.5-flash-lite** (shown as B)

Mein Sohn ging vor drei Monaten in den deutschen Kindergarten. In der ersten Woche weinte er jeden Morgen. Jetzt erzählt er mir von Freunden, singt deutsche Lieder und korrigiert meine Aussprache. Kinder lernen Sprachen viel schneller als Erwachsene.

meaning 3 · grammar 3 · level 3 · glosses 2
- 'ging vor drei Monaten' implies a single past event rather than ongoing attendance
- 'in den deutschen' uses definite article instead of indefinite
- 'weinte' uses Präteritum which is less natural for A1-A2 informal text
- 'Sprachen' is plural instead of singular
- Glosses miss key difficult words like 'Aussprache' and 'Erwachsene'

**gemini-3.6-flash** (shown as C)

Mein Sohn ist vor drei Monaten in den deutschen Kindergarten gegangen. In der ersten Woche hat er jeden Morgen geweint. Jetzt erzählt er mir von seinen Freunden. Er singt deutsche Lieder und korrigiert meine Aussprache. Kinder lernen eine Sprache viel schneller als Erwachsene.

meaning 3 · grammar 4 · level 5 · glosses 5
- 'ist vor drei Monaten in den deutschen Kindergarten gegangen' incorrectly implies a one-time trip 3 months ago
- 'in den deutschen Kindergarten' uses a definite article instead of indefinite

**gemini-3.1-flash-lite** (shown as D)

Mein Sohn geht seit drei Monaten in einen deutschen Kindergarten. In der ersten Woche hat er jeden Morgen geweint. Jetzt erzählt er mir von seinen Freunden. Er singt deutsche Lieder. Er korrigiert meine Aussprache. Kinder lernen eine Sprache viel schneller als Erwachsene.

meaning 4 · grammar 5 · level 4 · glosses 4
- 'Er singt deutsche Lieder. Er korrigiert meine Aussprache.' omits the conjunction 'und' from the source

## 13. blog · B1-B2

> Собеседование на немецком оказалось не таким страшным, как я себе представлял. Меня спросили о прошлом опыте, о том, почему я выбрал именно эту компанию, и как я справляюсь со стрессом. Сложнее всего было понимать быстрые вопросы с диалектом, поэтому я пару раз честно попросил повторить — и это никого не смутило.

**gemini-3.5-flash-lite** (shown as A)

Das Vorstellungsgespräch auf Deutsch war gar nicht so schlimm, wie ich mir das vorgestellt hatte. Sie fragten mich nach meiner früheren Erfahrung, warum ich genau diese Firma ausgewählt hatte und wie ich mit Stress umgehe. Am schwierigsten war es, die schnellen Fragen mit Dialekt zu verstehen, deshalb habe ich ein paar Mal ehrlich gebeten, das zu wiederholen – und das hat niemanden irritiert.

meaning 5 · grammar 3 · level 4 · glosses 4
- "Sie fragten mich" lacks a previous referent; "man fragte mich" or passive would be much better.
- "ehrlich gebeten, das zu wiederholen" is missing the pronominal adverb "darum" (darum gebeten).

**gemini-3.1-flash-lite** (shown as B)

Das Vorstellungsgespräch auf Deutsch war gar nicht so schlimm, wie ich es mir vorgestellt hatte. Ich wurde nach meiner bisherigen Erfahrung gefragt, warum ich mich ausgerechnet für diese Firma entschieden habe und wie ich mit Stress umgehe. Am schwierigsten war es, die schnellen Fragen mit Dialekt zu verstehen. Deshalb habe ich ein paar Mal ehrlich gebeten, die Frage zu wiederholen – und das hat niemanden gestört.

meaning 5 · grammar 4 · level 5 · glosses 5
- "ehrlich gebeten" is missing "darum" (darum gebeten).
- "die Frage zu wiederholen" uses the singular, but refers back to the plural "die schnellen Fragen".

**gemini-3.6-flash** (shown as C)

Das Vorstellungsgespräch auf Deutsch war gar nicht so schlimm, wie ich es mir vorgestellt hatte. Man fragte mich nach meiner bisherigen Erfahrung, warum ich mich genau für dieses Unternehmen entschieden habe und wie ich mit Stress umgehe. Am schwierigsten war es, die schnellen Fragen mit Dialekt zu verstehen. Deshalb habe ich ein paar Mal ehrlich darum gebeten, die Frage zu wiederholen — und das hat niemanden gestört.

meaning 5 · grammar 4 · level 5 · glosses 3
- "die Frage zu wiederholen" incorrectly uses the singular instead of referring back to the plural "die schnellen Fragen" (better: "sie zu wiederholen").

**gemini-3.8-flash** (shown as D)

Das Vorstellungsgespräch auf Deutsch war gar nicht so schlimm, wie ich es mir vorgestellt hatte. Man fragte mich nach meinen bisherigen Erfahrungen, warum ich mich für genau dieses Unternehmen entschieden habe und wie ich mit Stress umgehe. Am schwierigsten war es, die schnellen Fragen mit Dialekt zu verstehen, deshalb habe ich ein paar Mal ehrlich darum gebeten, sie zu wiederholen – und das hat niemanden gestört.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 14. blog · A1-A2

> Летом мы впервые поехали на Балтийское море. Вода была холодная, но дети всё равно купались весь день. Вечером мы ели рыбные булочки в порту и смотрели на корабли. В следующем году хотим вернуться туда на целую неделю.

**gemini-3.5-flash-lite** (shown as A)

Im Sommer sind wir zum ersten Mal an die Ostsee gefahren. Das Wasser war kalt, aber die Kinder haben den ganzen Tag gebadet. Abends haben wir Fischbrötchen im Hafen gegessen und auf die Schiffe geschaut. Nächstes Jahr wollen wir wieder dorthin fahren.

meaning 3 · grammar 4 · level 5 · glosses 4
- Missing translation for 'всё равно' (trotzdem)
- Missing translation for 'на целую неделю' (für eine ganze Woche)
- 'auf die Schiffe geschaut' is less natural than 'Schiffe beobachtet' or 'Schiffe angeschaut'

**gemini-3.6-flash** (shown as B)

Im Sommer sind wir zum ersten Mal an die Ostsee gefahren. Das Wasser war kalt, aber die Kinder haben trotzdem den ganzen Tag gebadet. Am Abend haben wir Fischbrötchen im Hafen gegessen und die Schiffe angeschaut. Nächstes Jahr wollen wir für eine ganze Woche zurückkommen.

meaning 5 · grammar 4 · level 5 · glosses 5
- 'zurückkommen' implies returning to where the speaker is currently located; to say returning to a holiday destination, 'dorthin zurückkehren' or 'wieder dorthin fahren' is the correct choice

**gemini-3.8-flash** (shown as C)

Im Sommer sind wir zum ersten Mal an die Ostsee gefahren. Das Wasser war kalt, aber die Kinder haben trotzdem den ganzen Tag gebadet. Am Abend haben wir Fischbrötchen im Hafen gegessen und Schiffe beobachtet. Nächstes Jahr wollen wir für eine ganze Woche wieder dorthin fahren.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.1-flash-lite** (shown as D)

Im Sommer waren wir zum ersten Mal an der Ostsee. Das Wasser war kalt. Aber die Kinder haben den ganzen Tag gebadet. Am Abend haben wir Fischbrötchen im Hafen gegessen. Wir haben die Schiffe beobachtet. Nächstes Jahr wollen wir wieder für eine Woche dorthin fahren.

meaning 3 · grammar 5 · level 5 · glosses 4
- Missing translation for 'всё равно' (trotzdem)
- Missing translation for 'целую' (ganze) in the phrase 'auf eine ganze Woche'
- Translated 'поехали' (went/drove - dynamic) as 'waren' (were - static), which changes the meaning slightly

## 15. forum · A1-A2

> Привет всем! Подскажите, пожалуйста, где в Дюссельдорфе можно недорого купить подержанный велосипед? В магазинах цены очень высокие. Может быть, есть хорошие сайты или блошиные рынки? Заранее спасибо!

**gemini-3.6-flash** (shown as A)

Hallo an alle! Wo kann man in Düsseldorf günstig ein gebrauchtes Fahrrad kaufen? In den Läden sind die Preise sehr hoch. Gibt es gute Websites oder Flohmärkte? Vielen Dank im Voraus!

meaning 4 · grammar 4 · level 5 · glosses 5
- Omitted the phrases 'Подскажите, пожалуйста' and 'Может быть'.
- 'Hallo an alle!' is grammatically correct but slightly less natural than 'Hallo zusammen!'.

**gemini-3.5-flash-lite** (shown as B)

Hallo zusammen! Wo kann ich in Düsseldorf ein gebrauchtes Fahrrad günstig kaufen? Die Preise in den Geschäften sind sehr hoch. Gibt es gute Webseiten oder einen Flohmarkt? Vielen Dank!

meaning 3 · grammar 5 · level 5 · glosses 3
- Omitted 'Подскажите, пожалуйста', 'Может быть' and 'Заранее'.
- Source uses plural 'блошиные рынки', but translated as singular 'einen Flohmarkt'.
- Gloss mismatch: 'Geschäften' is in Dativ, but glossed as Nominativ Plural 'магазины' instead of 'магазинах'.
- Gloss mismatch: 'gebrauchtes' has a neuter ending but is glossed as a masculine base form 'подержанный'.

**gemini-3.1-flash-lite** (shown as C)

Hallo zusammen! Ich suche ein gebrauchtes Fahrrad in Düsseldorf. Es muss billig sein. Die Fahrräder in den Geschäften sind sehr teuer. Kennen Sie gute Internetseiten oder Flohmärkte? Vielen Dank!

meaning 2 · grammar 5 · level 4 · glosses 3
- Drastically altered sentence structure and meaning: changed 'где можно купить' to 'Ich suche...' and 'Es muss billig sein.', and 'цены высокие' to 'Die Fahrräder... sind sehr teuer.'
- Omitted 'Подскажите, пожалуйста', 'Может быть' and 'Заранее'.
- Gloss inaccuracy: 'billig' means 'дешевый', while 'недорого' is 'günstig'.
- Gloss mismatch: 'Geschäften' glossed as Nominativ Plural 'магазины'.

**gemini-3.8-flash** (shown as D)

Hallo zusammen! Wo kann man in Düsseldorf günstig ein gebrauchtes Fahrrad kaufen? In den Geschäften sind die Preise sehr hoch. Gibt es vielleicht gute Websites oder Flohmärkte? Vielen Dank im Voraus!

meaning 5 · grammar 5 · level 5 · glosses 5
- Omitted 'Подскажите, пожалуйста' (though this is an acceptable and natural simplification to avoid complex subordinate clauses at the A1-A2 level).

## 16. forum · B1-B2

> Пришло письмо из налоговой с требованием подать декларацию за прошлый год, хотя я работаю по найму и думал, что мне это не нужно. Оказалось, что из-за смены работы посреди года и пособия по безработице декларация обязательна. Кто-нибудь пользовался программами вроде ELSTER без помощи консультанта? Насколько это сложно?

**gemini-3.8-flash** (shown as A)

Ich habe einen Brief vom Finanzamt bekommen, in dem ich aufgefordert werde, eine Steuererklärung für das letzte Jahr abzugeben. Eigentlich bin ich angestellt und dachte, dass ich das gar nicht machen muss. Es stellte sich jedoch heraus, dass die Erklärung wegen meines Jobwechsels mitten im Jahr und wegen des Arbeitslosengeldes Pflicht ist. Hat jemand schon mal Programme wie ELSTER ohne die Hilfe eines Beraters genutzt? Wie schwierig ist das eigentlich?

meaning 4 · grammar 5 · level 5 · glosses 5
- The translation of 'хотя' by splitting the sentence and using 'Eigentlich bin ich angestellt' changes the direct logical connection slightly.

**gemini-3.5-flash-lite** (shown as B)

Ich habe einen Brief vom Finanzamt bekommen mit der Aufforderung, die Steuererklärung für das letzte Jahr abzugeben, obwohl ich angestellt bin und dachte, dass ich das nicht muss. Es stellte sich heraus, dass die Erklärung wegen des Jobwechsels mitten im Jahr und des Arbeitslosengeldes verpflichtend ist. Hat jemand von euch Programme wie ELSTER ohne Steuerberater genutzt? Wie schwer ist das?

meaning 5 · grammar 4 · level 5 · glosses 5
- Suboptimal word order (Ausklammerung): 'einen Brief vom Finanzamt bekommen mit der Aufforderung' (better: 'einen Brief ... mit der Aufforderung bekommen').

**gemini-3.6-flash** (shown as C)

Ein Brief vom Finanzamt ist angekommen mit der Aufforderung, die Steuererklärung für das letzte Jahr abzugeben, obwohl ich angestellt bin und dachte, dass ich das nicht tun muss. Es hat sich herausgestellt, dass die Erklärung wegen des Jobwechsels unter dem Jahr und wegen des Arbeitslosengeldes Pflicht ist. Hat jemand schon Programme wie ELSTER ohne die Hilfe eines Beraters genutzt? Wie schwierig ist das?

meaning 5 · grammar 4 · level 4 · glosses 4
- Suboptimal word order: 'ist angekommen mit der Aufforderung' (better inside the sentence brace).
- 'unter dem Jahr' is a regional/colloquial expression for 'посреди года' (standard: 'mitten im Jahr').
- The gloss 'herausgestellt' is incomplete without the reflexive pronoun 'sich'.

**gemini-3.1-flash-lite** (shown as D)

Ich habe einen Brief vom Finanzamt bekommen, in dem ich aufgefordert werde, eine Steuererklärung für das letzte Jahr abzugeben, obwohl ich angestellt bin und dachte, dass ich das nicht muss. Es stellte sich heraus, dass die Steuererklärung Pflicht ist, weil ich mitten im Jahr den Job gewechselt habe und Arbeitslosengeld bezog. Hat jemand von euch schon einmal Programme wie ELSTER ohne die Hilfe eines Steuerberaters benutzt? Wie kompliziert ist das?

meaning 5 · grammar 4 · level 5 · glosses 3
- Inconsistent tense usage in the subordinate clause: mixing Perfekt ('gewechselt habe') and Präteritum ('bezog').
- The gloss 'aufgefordert' as 'потребовано' is unnatural in Russian and does not properly reflect the passive construction 'aufgefordert werde'.

## 17. forum · A1-A2

> У нас в квартире уже неделю не работает отопление. Я написала хаусферверальтунгу два раза, но ответа нет. Что мне делать? Могу ли я платить меньше аренды, пока не починят?

**gemini-3.5-flash-lite** (shown as A)

Die Heizung in meiner Wohnung geht seit einer Woche nicht. Ich habe dem Hausverwalter zweimal geschrieben, aber es gibt keine Antwort. Was soll ich tun? Kann ich weniger Miete bezahlen?

meaning 3 · grammar 5 · level 5 · glosses 5
- Der Teil 'пока не починят' (bis es repariert ist) wurde komplett weggelassen.
- Übersetzt 'у нас в квартире' (in unserer Wohnung) mit 'in meiner Wohnung'.

**gemini-3.8-flash** (shown as B)

In unserer Wohnung funktioniert die Heizung seit einer Woche nicht mehr. Ich habe der Hausverwaltung schon zweimal geschrieben. Aber ich habe keine Antwort bekommen. Was soll ich jetzt tun? Kann ich weniger Miete zahlen, bis alles repariert ist?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.1-flash-lite** (shown as C)

Seit einer Woche funktioniert unsere Heizung nicht. Ich habe zweimal an die Hausverwaltung geschrieben. Aber ich bekomme keine Antwort. Was soll ich tun? Darf ich weniger Miete zahlen, bis die Heizung wieder funktioniert?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.6-flash** (shown as D)

Seit einer Woche funktioniert die Heizung in unserer Wohnung nicht. Ich habe zweimal an die Hausverwaltung geschrieben. Aber ich habe keine Antwort bekommen. Was soll ich tun? Kann ich weniger Miete zahlen, bis die Heizung repariert ist?

meaning 5 · grammar 5 · level 5 · glosses 4
- Der Glossar-Eintrag 'починена' (weiblich) für 'repariert ist' ist im russischen Kontext falsch, da sich das Wort auf 'отопление' (sächlich) bezieht. Es müsste grammatikalisch korrekt 'починено' lauten.

## 18. forum · B1-B2

> Хочу сменить больничную кассу: моя повысила дополнительный взнос, а услуги остались прежними. Насколько я понимаю, при повышении взноса есть особое право на расторжение договора. Подскажите, нужно ли сначала найти новую кассу или можно сразу отправить заявление старой?

**gemini-3.8-flash** (shown as A)

Ich möchte meine Krankenkasse wechseln: Meine Kasse hat den Zusatzbeitrag erhöht, aber die Leistungen sind gleich geblieben. Soviel ich weiß, gibt es bei einer Beitragserhöhung ein Sonderkündigungsrecht. Könnt ihr mir sagen, ob ich zuerst eine neue Kasse finden muss oder ob ich gleich bei der alten kündigen kann?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.6-flash** (shown as B)

Ich möchte die Krankenkasse wechseln: meine hat den Zusatzbeitrag erhöht, aber die Leistungen sind gleich geblieben. Soviel ich weiß, gibt es bei einer Beitragserhöhung ein Sonderkündigungsrecht. Könnt ihr mir sagen, ob ich zuerst eine neue Kasse finden muss oder ob ich der alten sofort die Kündigung schicken kann?

meaning 5 · grammar 4 · level 5 · glosses 5
- meine hat den Zusatzbeitrag erhöht (capitalization after colon is required for independent clauses: 'Meine')

**gemini-3.5-flash-lite** (shown as C)

Ich möchte meine Krankenkasse wechseln: meine hat den Zusatzbeitrag erhöht, aber die Leistungen sind gleich geblieben. Soweit ich weiß, gibt es bei einer Beitragserhöhung ein Sonderkündigungsrecht. Sagt mir bitte, muss ich erst eine neue Kasse finden oder kann ich direkt die Kündigung an die alte schicken?

meaning 5 · grammar 3 · level 4 · glosses 4
- meine hat den Zusatzbeitrag erhöht (capitalization after colon is required for independent clauses: 'Meine')
- Sagt mir bitte, muss ich... (comma splice/missing conjunction 'ob' or requires a colon instead of a comma)

**gemini-3.1-flash-lite** (shown as D)

Ich möchte meine Krankenkasse wechseln, da meine aktuelle Kasse den Zusatzbeitrag erhöht hat, die Leistungen aber gleich geblieben sind. Soweit ich weiß, habe ich bei einer Beitragserhöhung ein Sonderkündigungsrecht. Können Sie mir sagen, ob ich zuerst eine neue Krankenkasse finden muss oder ob ich direkt die Kündigung an die alte schicken kann?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 19. forum · A1-A2

> Кто знает хорошие бесплатные курсы немецкого в Гамбурге? Я работаю днём, поэтому мне нужны вечерние занятия. Мой уровень сейчас примерно A2. Буду рада любым советам!

**gemini-3.1-flash-lite** (shown as A)

Wer kennt gute kostenlose Deutschkurse in Hamburg? Ich arbeite tagsüber. Deshalb brauche ich Abendkurse. Mein Deutsch ist auf dem Niveau A2. Ich freue mich über Tipps!

meaning 3 · grammar 5 · level 5 · glosses 5
- Missed the translation for 'сейчас' (jetzt) and 'примерно' (ungefähr)
- Missed 'любым' (jeden), translated as general 'Tipps'

**gemini-3.5-flash-lite** (shown as B)

Wer kennt gute kostenlose Deutschkurse in Hamburg? Ich arbeite tagsüber. Deshalb brauche ich Abendkurse. Mein Niveau ist jetzt ungefähr A2. Ich freue mich über jeden Tipp!

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.8-flash** (shown as C)

Wer kennt gute kostenlose Deutschkurse in Hamburg? Ich arbeite am Tag, deshalb brauche ich Unterricht am Abend. Mein Niveau ist jetzt ungefähr A2. Ich freue mich über jeden Tipp!

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**gemini-3.6-flash** (shown as D)

Wer kennt gute kostenlose Deutschkurse in Hamburg? Ich arbeite am Tag. Deshalb brauche ich einen Abendkurs. Mein Niveau ist jetzt ungefähr A2. Ich freue mich über jeden Tipp!

meaning 4 · grammar 5 · level 5 · glosses 4
- Translated plural 'вечерние занятия' as singular 'einen Abendkurs'

## 20. forum · B1-B2

> Соседи сверху регулярно устраивают шумные вечеринки после десяти вечера, хотя в правилах дома прописан ночной покой. Разговор с ними ничего не дал. Стоит ли сразу писать управляющей компании или сначала вести протокол шума, чтобы потом были доказательства?

**gemini-3.8-flash** (shown as A)

Die Nachbarn über mir feiern regelmäßig laute Partys nach zweiundzwanzig Uhr, obwohl in der Hausordnung eine Nachtruhe festgelegt ist. Ein Gespräch mit ihnen hat leider nichts gebracht. Lohnt es sich, direkt an die Hausverwaltung zu schreiben, oder sollte ich zuerst ein Lärmprotokoll führen, um später Beweise zu haben?

meaning 4 · grammar 4 · level 5 · glosses 5
- Added 'leider', which is not present in the original Russian text.
- Used 'eine Nachtruhe' instead of the more standard definite article 'die Nachtruhe'.
- Suboptimal word order: the time phrase 'nach zweiundzwanzig Uhr' should ideally precede the accusative object 'laute Partys' (TeKaMoLo rule).

**gemini-3.5-flash-lite** (shown as B)

Die Nachbarn von oben veranstalten regelmäßig laute Partys nach zehn Uhr abends, obwohl in der Hausordnung die Nachtruhe festgelegt ist. Ein Gespräch mit ihnen hat nichts gebracht. Lohnt es sich, sofort an die Hausverwaltung zu schreiben oder erst ein Lärmprotokoll zu führen, damit es später Beweise gibt?

meaning 5 · grammar 4 · level 5 · glosses 5
- Suboptimal word order: the time phrase 'nach zehn Uhr abends' should ideally precede the accusative object 'laute Partys'.

**gemini-3.1-flash-lite** (shown as C)

Meine Nachbarn oben feiern regelmäßig laute Partys nach zehn Uhr abends, obwohl in der Hausordnung die Nachtruhe vorgeschrieben ist. Ein Gespräch mit ihnen hat leider nichts gebracht. Sollte ich mich sofort an die Hausverwaltung wenden oder erst ein Lärmprotokoll führen, damit ich später Beweise habe?

meaning 4 · grammar 4 · level 5 · glosses 4
- Added 'leider', which changes the nuance and is not in the source text.
- The phrase 'Meine Nachbarn oben' is slightly clunky and less natural than 'Die Nachbarn von oben' or 'Die Nachbarn über mir'.
- Suboptimal word order: 'nach zehn Uhr abends' should precede 'laute Partys'.
- Glossing the word 'Nachbarn' is unnecessary for B1-B2 as it is fundamental A1 vocabulary.

**gemini-3.6-flash** (shown as D)

Die Nachbarn von oben veranstalten regelmäßig nach zehn Uhr abends laute Partys, obwohl in der Hausordnung die Nachtruhe verankert ist. Ein Gespräch mit ihnen hat nichts gebracht. Lohnt es sich, sofort der Hausverwaltung zu schreiben, oder sollte man zuerst ein Lärmprotokoll führen, damit man später Beweise hat?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed
