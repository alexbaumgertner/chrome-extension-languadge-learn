# Model judge report

- Date: 2026-11-20T23:11:45.934Z
- Judge: `gemini-3.1-pro-preview` (blind, shuffled letters; same model family as candidates — spot-check)
- Paragraphs: 20

| Model | Overall | Meaning | Grammar | Level fit | Glosses | $/paragraph | Avg latency | Judged |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `38-v2-a` | 4.76 | 4.85 | 4.70 | 4.95 | 4.55 | 0.00155 | 3814 ms | 20/20 |
| `38-v2-b` | 4.69 | 4.75 | 4.70 | 4.85 | 4.45 | 0.00154 | 4301 ms | 20/20 |
| `lite31-v2-low` | 4.34 | 4.00 | 4.30 | 4.70 | 4.35 | 0.00066 | 1486 ms | 20/20 |
| `lite31-v2-minimal` | 4.31 | 3.85 | 4.65 | 4.75 | 4.00 | 0.00052 | 1445 ms | 20/20 |
| `lite35-v2-minimal` | 4.09 | 3.90 | 3.90 | 4.60 | 3.95 | 0.00082 | 1156 ms | 20/20 |

## 1. news · A1-A2

> В понедельник в Германии снова бастуют машинисты поездов. Профсоюз GDL призвал своих членов прекратить работу с двух часов ночи до вечера вторника. Deutsche Bahn советует пассажирам по возможности перенести поездки и заранее проверять расписание в приложении.

**lite35-v2-minimal** (shown as A)

Am Montag streiken in Deutschland wieder die Lokführer. Die Gewerkschaft GDL ruft ihre Mitglieder auf. Sie sollen von zwei Uhr nachts bis Dienstagabend nicht arbeiten. Die Deutsche Bahn rät allen Fahrgästen: Verschieben Sie Ihre Reise. Oder prüfen Sie das Fahrplan in der App.

meaning 3 · grammar 3 · level 5 · glosses 3
- Falscher Artikel: 'das Fahrplan' anstatt 'den Fahrplan' (Akkusativ, der Fahrplan).
- Tippfehler im Gloss: 'сноva' enthält den lateinischen Buchstaben 'v'.
- Sinnabweichung: 'по возможности' (nach Möglichkeit) wurde komplett weggelassen.
- Sinnabweichung: Aus dem 'und' (расписание) wurde ein 'Oder' ('Oder prüfen Sie...').

**lite31-v2-minimal** (shown as B)

Am Montag streiken die Zugführer in Deutschland. Der Verband GDL sagt: Die Arbeit stoppt ab zwei Uhr nachts. Die Arbeit endet am Dienstagabend. Die Deutsche Bahn gibt einen Rat. Die Passagiere sollen ihre Reise verschieben. Bitte prüfen Sie das Fahrplan-App vor der Reise.

meaning 2 · grammar 3 · level 4 · glosses 4
- Falscher Artikel: 'das Fahrplan-App' anstatt 'die Fahrplan-App' (die App).
- Bedeutungsfehler: 'Zugführer' bedeutet Schaffner, der Maschinist ist der 'Lokführer'.
- Sinnverdrehung: 'Die Arbeit endet am Dienstagabend' bedeutet, dass sie dort aufhören zu arbeiten, im Original endet aber der Streik (die Arbeitsniederlegung) am Dienstagabend.
- Sinnabweichung: 'по возможности' fehlt.

**lite31-v2-low** (shown as C)

Am Montag gibt es in Deutschland wieder einen Streik bei der Bahn. Die Lokführer arbeiten nicht. Sie streiken von Dienstag nacht bis Dienstag abend. Die Deutsche Bahn sagt: Bitte planen Sie Ihre Reise neu. Prüfen Sie bitte vorher den Fahrplan in der App.

meaning 2 · grammar 3 · level 4 · glosses 4
- Rechtschreibung: 'Dienstag nacht' und 'Dienstag abend' müssen zusammengeschrieben werden (Dienstagnacht, Dienstagabend).
- Falsche Fakten: Im Original beginnt die Arbeitsniederlegung ab zwei Uhr nachts (am Montag), hier steht 'von Dienstag nacht'.
- Falsche Fakten: Die Gewerkschaft GDL wurde komplett ausgelassen.

**38-v2-a** (shown as D)

Am Montag streiken in Deutschland wieder die Lokführer. Die Gewerkschaft GDL hat dazu aufgerufen. Die Lokführer arbeiten von zwei Uhr nachts bis Dienstagabend nicht. Die Deutsche Bahn gibt den Fahrgästen einen Tipp: Bitte verschieben Sie Ihre Reise, wenn das geht. Prüfen Sie den Fahrplan vorher in der App.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**38-v2-b** (shown as E)

Am Montag streiken in Deutschland wieder die Lokführer. Die Gewerkschaft GDL hat dazu aufgerufen. Die Mitglieder arbeiten von zwei Uhr nachts bis Dienstagabend nicht. Die Deutsche Bahn rät den Fahrgästen: Verschieben Sie Ihre Reisen, wenn es möglich ist. Prüfen Sie den Fahrplan vorher in der App.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 2. news · B1-B2

> Бундестаг принял закон, который упрощает получение гражданства. Теперь подать заявление можно уже через пять лет проживания в стране, а при особых успехах в интеграции — через три года. Кроме того, двойное гражданство больше не будет исключением: новым гражданам не придётся отказываться от прежнего паспорта.

**lite31-v2-minimal** (shown as A)

Der Bundestag hat ein neues Gesetz verabschiedet, das die Einbürgerung deutlich vereinfacht. Ab sofort kann man schon nach fünf Jahren Aufenthalt in Deutschland die Staatsbürgerschaft beantragen. Wenn jemand besonders gute Leistungen bei der Integration zeigt, geht das sogar schon nach drei Jahren. Zudem ist die doppelte Staatsbürgerschaft nun die Regel und keine Ausnahme mehr: Neue Bürger müssen ihren alten Pass nicht mehr abgeben.

meaning 4 · grammar 5 · level 5 · glosses 5
- Unjustified semantic additions that were not in the source: "neues", "deutlich", and "nun die Regel".

**38-v2-b** (shown as B)

Der Bundestag hat ein Gesetz beschlossen, das die Einbürgerung vereinfacht. Nun kann man den Antrag bereits nach fünf Jahren Aufenthalt im Land stellen, und bei besonderen Integrationsleistungen sogar schon nach drei Jahren. Außerdem wird die doppelte Staatsbürgerschaft keine Ausnahme mehr sein: Neue Staatsbürger müssen ihren bisherigen Pass nicht mehr aufgeben.

meaning 5 · grammar 4 · level 5 · glosses 5
- Collocation error: "Pass aufgeben" is unnatural. One should use "den Pass abgeben" or "auf den Pass verzichten".

**lite31-v2-low** (shown as C)

Der Bundestag hat ein Gesetz verabschiedet, das die Einbürgerung erleichtert. Man kann jetzt schon nach fünf Jahren in Deutschland einen Antrag auf die Staatsbürgerschaft stellen. Wenn man besonders gut integriert ist, geht das sogar schon nach drei Jahren. Außerdem ist die doppelte Staatsbürgerschaft nun die Regel und nicht mehr die Ausnahme: Neue Bürger müssen ihren alten Pass nicht mehr abgeben.

meaning 4 · grammar 5 · level 5 · glosses 5
- Unjustified addition: "nun die Regel und" is not present in the Russian source.

**38-v2-a** (shown as D)

Der Bundestag hat ein neues Gesetz beschlossen, das die Einbürgerung vereinfacht. Ab jetzt kann man den Antrag schon nach fünf Jahren Aufenthalt in Deutschland stellen, und bei besonderen Integrationsleistungen sogar schon nach drei Jahren. Außerdem wird die doppelte Staatsbürgerschaft nicht mehr die Ausnahme sein: Neue Staatsbürger müssen ihren bisherigen Pass nicht mehr abgeben.

meaning 4 · grammar 5 · level 5 · glosses 5
- Unjustified addition: added the word "neues" to "Gesetz".

**lite35-v2-minimal** (shown as E)

Der Bundestag hat ein Gesetz angenommen, das den Erwerb der Staatsbürgerschaft erleichtert. Jetzt kann man den Antrag schon nach fünf Jahren Aufenthalt im Land stellen, und bei besonderen Erfolgen bei der Integration schon nach drei Jahren. Außerdem ist die doppelte Staatsbürgerschaft nicht mehr die Ausnahme: Neue Bürger müssen nicht mehr auf ihren früheren Pass verzichten.

meaning 5 · grammar 5 · level 5 · glosses 5
- Minor stylistic issue: "Gesetz angenommen" is grammatically correct but less idiomatic than "verabschiedet" or "beschlossen"; "früheren Pass" is slightly less natural than "bisherigen Pass".

## 3. news · A1-A2

> С января стоимость проездного Deutschlandticket выросла до 63 евро в месяц. Билет по-прежнему действует во всех автобусах, трамваях и региональных поездах по всей стране. Скоростные поезда ICE и IC в него не входят.

**lite35-v2-minimal** (shown as A)

Seit Januar kostet das Deutschlandticket 63 Euro im Monat. Der Ticket gilt in allen Bussen, Trams und Regionalzügen in ganz Deutschland. Aber ICE und IC kosten extra.

meaning 3 · grammar 3 · level 4 · glosses 4
- Incorrect article: 'Der Ticket' (should be 'Das Ticket')
- Missing translation for 'по-прежнему' (still)
- Distorted meaning: 'kosten extra' translates to 'cost extra' rather than 'в него не входят' (are not included)

**38-v2-b** (shown as B)

Ab Januar ist das Deutschlandticket teurer. Es kostet jetzt 63 Euro pro Monat. Man kann das Ticket immer noch in allen Bussen, Straßenbahnen und Regionalzügen nutzen. Es gilt in ganz Deutschland. Aber schnelle Züge wie ICE oder IC kann man nicht nutzen.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**lite31-v2-minimal** (shown as C)

Das Deutschlandticket kostet ab Januar 63 Euro pro Monat. Der Preis ist höher als früher. Das Ticket gilt für alle Busse, Straßenbahnen und Regionalzüge in Deutschland. Schnelle Züge wie ICE oder IC gehören nicht dazu.

meaning 4 · grammar 5 · level 5 · glosses 3
- Missing translation for 'по-прежнему' (still)
- Incorrect gloss translation: the base form 'früh' means 'рано', not 'раньше' ('раньше' is the comparative 'früher')

**lite31-v2-low** (shown as D)

Das Deutschlandticket kostet ab Januar 63 Euro pro Monat. Der Preis ist höher als früher. Mit dem Ticket fahren Sie in allen Bussen, Straßenbahnen und Regionalzügen in ganz Deutschland. Aber Achtung: Schnelle Züge wie ICE oder IC sind nicht dabei.

meaning 3 · grammar 4 · level 5 · glosses 3
- Missing translation for 'по-прежнему' (still)
- Invented text: added 'Aber Achtung:'
- Slightly unnatural preposition: 'in allen Bussen fahren' (it is much more natural to say 'mit allen Bussen fahren')
- Incorrect gloss translation: 'früh' means 'рано', not 'раньше'

**38-v2-a** (shown as E)

Ab Januar kostet das Deutschlandticket 63 Euro im Monat. Der Preis ist gestiegen. Das Ticket gilt weiter in allen Bussen, Straßenbahnen und Regionalzügen in ganz Deutschland. Schnelle Züge wie ICE und IC gehören nicht dazu.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 4. news · B1-B2

> Арендная плата в крупных немецких городах продолжает расти. По данным исследовательского института, за последний год средняя цена квадратного метра в Мюнхене поднялась почти на семь процентов. Эксперты связывают это с нехваткой нового жилья и высокими процентными ставками, из-за которых многие откладывают покупку квартиры.

**lite31-v2-low** (shown as A)

Die Mieten in großen deutschen Städten steigen immer weiter. Laut einem Forschungsinstitut sind die durchschnittlichen Preise pro Quadratmeter in München im letzten Jahr um fast sieben Prozent gestiegen. Experten führen das auf den Mangel an neuem Wohnraum und auf hohe Zinsen zurück, weshalb viele Menschen den Kauf einer Wohnung erst einmal verschieben.

meaning 4 · grammar 5 · level 5 · glosses 5
- Meaning: Uses the plural 'Preise' instead of the singular 'Preis' for 'цена'.
- Meaning: Adds the phrase 'erst einmal' (for now), which is absent in the original Russian source.

**38-v2-a** (shown as B)

Die Mieten in großen deutschen Städten steigen immer weiter. Nach Angaben eines Forschungsinstituts ist der durchschnittliche Quadratmeterpreis in München im letzten Jahr um fast sieben Prozent gestiegen. Experten führen das auf den Mangel an neuem Wohnraum und die hohen Zinsen zurück, wegen derer viele den Kauf einer Wohnung aufschieben.

meaning 5 · grammar 4 · level 5 · glosses 4
- Grammar: 'wegen derer' is grammatically incorrect. The correct relative pronoun in the genitive plural is 'deren'.
- Glosses: Only 'führen' is marked in the text for the separable verb 'zurückführen', which is pedagogically misleading for learners.

**lite31-v2-minimal** (shown as C)

Die Mieten in den großen deutschen Städten steigen immer weiter. Laut einem Forschungsinstitut ist der durchschnittliche Preis pro Quadratmeter in München im letzten Jahr um fast sieben Prozent gestiegen. Experten führen das auf den Mangel an neuen Wohnungen und die hohen Zinsen zurück, weshalb viele Menschen den Kauf einer Wohnung aufschieben.

meaning 5 · grammar 5 · level 5 · glosses 4
- Glosses: The gloss lists 'auf etwas zurückführen', but only the base stem 'führen' is highlighted in the text, disconnecting the prefix from the definition.

**38-v2-b** (shown as D)

Die Mieten in den deutschen Großstädten steigen weiter. Laut einem Forschungsinstitut ist der durchschnittliche Preis pro Quadratmeter in München im letzten Jahr um fast sieben Prozent gestiegen. Experten führen das auf den Mangel an neuem Wohnraum und auf die hohen Zinsen zurück, wegen derer viele Menschen den Kauf einer Wohnung aufschieben.

meaning 5 · grammar 4 · level 5 · glosses 4
- Grammar: Uses 'wegen derer' instead of the correct genitive plural relative pronoun 'wegen deren'.
- Glosses: Only 'führen' is marked for the separable verb 'zurückführen', failing to highlight the whole sensible unit.

**lite35-v2-minimal** (shown as E)

Die Mieten in großen deutschen Städten steigen weiter. Laut einem Forschungsinstitut ist der durchschnittliche Quadratmeterpreis in München im vergangenen Jahr um fast sieben Prozent gestiegen. Experten führen das auf den Mangel an neuem Wohnraum und hohe Zinsen zurück, weshalb viele den Kauf einer Wohnung verschieben.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 5. news · A1-A2

> Метеорологи предупреждают о сильной жаре на юге Германии. В выходные температура может подняться до 36 градусов. Врачи советуют пить больше воды, не выходить на солнце в обед и чаще проведывать пожилых соседей.

**lite31-v2-minimal** (shown as A)

Im Süden von Deutschland wird es sehr heiß. Am Wochenende steigt die Temperatur auf 36 Grad. Die Ärzte geben einen Rat: Trinken Sie viel Wasser. Gehen Sie am Mittag nicht in die Sonne. Besuchen Sie Ihre alten Nachbarn.

meaning 2 · grammar 5 · level 5 · glosses 5
- Omitted 'Метеорологи предупреждают' (Meteorologists warn).
- 'может подняться' (can rise) is changed to 'steigt' (rises), losing the possibility.
- 'больше воды' (more water) is translated as 'viel Wasser' (a lot of water).
- Omitted 'чаще' (more often).

**lite35-v2-minimal** (shown as B)

Es wird sehr heiß im Süden von Deutschland. Am Wochenende haben wir bis zu 36 Grad. Ärzte raten: Trinken Sie viel Wasser. Gehen Sie am Mittag nicht in die Sonne. Und helfen Sie oft alten Nachbarn.

meaning 2 · grammar 5 · level 5 · glosses 5
- Omitted 'Метеорологи предупреждают' (Meteorologists warn).
- 'больше воды' (more water) is translated as 'viel Wasser' (a lot of water).
- 'проведывать' (to check on/visit) is wrongly translated as 'helfen Sie' (help).
- Omitted 'чаще' (more often), translated as 'oft' (often).

**38-v2-b** (shown as C)

Im Süden von Deutschland wird es sehr heiß. Am Wochenende kann die Temperatur bis auf 36 Grad steigen. Ärzte geben wichtige Tipps. Die Menschen sollen viel Wasser trinken. Zur Mittagszeit soll man nicht in die Sonne gehen. Man soll auch nach älteren Nachbarn schauen und ihnen helfen.

meaning 3 · grammar 5 · level 4 · glosses 5
- Omitted 'Метеорологи предупреждают' (Meteorologists warn).
- 'больше воды' (more water) is translated as 'viel Wasser' (a lot of water).
- Added 'und ihnen helfen' (and help them), which is not in the source text.
- Omitted 'чаще' (more often).

**38-v2-a** (shown as D)

Meteorologen warnen vor großer Hitze im Süden von Deutschland. Am Wochenende kann die Temperatur bis auf 36 Grad steigen. Ärzte raten: Trinken Sie mehr Wasser! Gehen Sie am Mittag nicht in die Sonne. Besuchen Sie auch oft ältere Nachbarn.

meaning 4 · grammar 5 · level 5 · glosses 5
- 'чаще' (more often) is translated as 'oft' (often) instead of 'öfter'.

**lite31-v2-low** (shown as E)

Es wird sehr heiß in Süddeutschland. Die Temperaturen steigen am Wochenende vielleicht auf 36 Grad. Ärzte sagen: Trinken Sie viel Wasser! Gehen Sie am Mittag nicht in die Sonne. Besuchen Sie bitte oft Ihre alten Nachbarn.

meaning 2 · grammar 5 · level 5 · glosses 5
- Omitted 'Метеорологи предупреждают' (Meteorologists warn).
- 'может подняться' (can rise) is changed to 'steigen ... vielleicht' (maybe rise).
- 'советуют' (advise) is simplified to 'sagen' (say).
- 'больше воды' (more water) is translated as 'viel Wasser' (a lot of water).
- 'чаще' (more often) is translated as 'oft' (often) instead of 'öfter'.

## 6. news · B1-B2

> Федеральное агентство по труду сообщило, что число открытых вакансий для специалистов в сфере ухода за больными снова увеличилось. Особенно не хватает медсестёр в домах престарелых. Правительство надеется привлечь больше работников из-за рубежа и ускорить признание иностранных дипломов.

**lite31-v2-low** (shown as A)

Die Bundesagentur für Arbeit hat mitgeteilt, dass die Zahl der offenen Stellen für Pflegekräfte wieder gestiegen ist. Besonders in Altenheimen fehlen dringend Pflegekräfte. Die Regierung hofft, mehr Arbeitskräfte aus dem Ausland zu gewinnen und die Anerkennung ausländischer Abschlüsse zu beschleunigen.

meaning 4 · grammar 5 · level 5 · glosses 5
- Added 'dringend' which is not in the source.

**lite31-v2-minimal** (shown as B)

Die Bundesagentur für Arbeit hat mitgeteilt, dass die Anzahl der offenen Stellen für Fachkräfte in der Krankenpflege erneut gestiegen ist. Besonders in Seniorenheimen fehlen dringend Pflegekräfte. Die Regierung hofft, mehr Arbeitskräfte aus dem Ausland zu gewinnen und die Anerkennung ausländischer Abschlüsse zu beschleunigen.

meaning 4 · grammar 5 · level 5 · glosses 4
- Added 'dringend' which is not in the source.
- Gloss includes 'получать' which is incorrect for 'gewinnen' in this context.

**38-v2-b** (shown as C)

Die Bundesagentur für Arbeit hat mitgeteilt, dass die Zahl der offenen Stellen für Pflegekräfte wieder gestiegen ist. Besonders in Altenheimen fehlen viele Fachkräfte. Die Regierung hofft nun, mehr Personal aus dem Ausland zu gewinnen und die Anerkennung ausländischer Abschlüsse zu beschleunigen.

meaning 4 · grammar 5 · level 5 · glosses 5
- Added 'nun' and 'viele' which are not in the source.
- 'Fachkräfte' is too generic for 'медсестёр'.

**38-v2-a** (shown as D)

Die Bundesagentur für Arbeit hat mitgeteilt, dass die Zahl der offenen Stellen für Pflegekräfte wieder gestiegen ist. Besonders in Altenheimen fehlt es an Fachpersonal. Die Regierung hofft nun darauf, mehr Arbeitskräfte aus dem Ausland anzuziehen und die Anerkennung von ausländischen Abschlüssen zu beschleunigen.

meaning 4 · grammar 4 · level 5 · glosses 5
- Added 'nun darauf' which is not in the source.
- 'anzuziehen' is unnatural for recruiting workers (better: 'gewinnen' or 'anwerben').

**lite35-v2-minimal** (shown as E)

Das Bundesarbeitsamt hat mitgeteilt, dass die Zahl der offenen Stellen für Pflegekräfte wieder gestiegen ist. Besonders in Altenheimen fehlen Krankenschwestern. Die Regierung hofft, mehr Arbeitskräfte aus dem Ausland anzulocken und die Anerkennung ausländischer Diplome zu beschleunigen.

meaning 3 · grammar 3 · level 4 · glosses 2
- 'anzulocken' has a manipulative connotation (to lure).
- 'Krankenschwestern' work in hospitals; 'Pflegekräfte' or 'Altenpfleger' are used for nursing homes.
- 'Diplome' refers to specific academic degrees in German, not a general qualification ('Abschlüsse' is better).
- Gloss 'отсутствовать' for 'fehlen' misses the contextual meaning 'не хватать'.

## 7. news · A1-A2

> В Берлине открылся новый рождественский рынок у Красной ратуши. Посетители могут покататься на колесе обозрения, попробовать глинтвейн и купить подарки ручной работы. Рынок работает каждый день с полудня до десяти вечера до конца декабря.

**lite35-v2-minimal** (shown as A)

In Berlin gibt es einen neuen Weihnachtsmarkt an dem Roten Rathaus. Die Besucher können mit dem Riesenrad fahren, Glühwein trinken und Geschenke kaufen. Der Markt ist jeden Tag offen.

meaning 2 · grammar 4 · level 5 · glosses 5
- Missing facts: 'ручной работы' (handgemachte), 'с полудня до десяти вечера' (opening hours), and 'до конца декабря' (end of December).
- 'an dem Roten Rathaus' is grammatically possible but unnatural; it should be contracted to 'am Roten Rathaus'.

**lite31-v2-low** (shown as B)

In Berlin gibt es einen neuen Weihnachtsmarkt bei der Roten Rathaus. Man kann hier viel machen. Besucher fahren mit dem Riesenrad. Sie trinken Glühwein. Man kann auch Geschenke kaufen. Die Geschenke sind handgemacht. Der Markt ist jeden Tag offen. Er ist von 12 Uhr mittags bis 22 Uhr abends geöffnet. Das geht bis Ende Dezember.

meaning 5 · grammar 2 · level 4 · glosses 5
- 'bei der Roten Rathaus' is a severe gender error. 'Rathaus' is neuter (das), so the dative form must be 'beim' (bei dem) 'Roten Rathaus'.

**lite31-v2-minimal** (shown as C)

In Berlin gibt es einen neuen Weihnachtsmarkt. Er ist bei der Roten Rathaus. Sie können mit dem Riesenrad fahren. Sie können Glühwein trinken. Sie können Geschenke kaufen. Der Markt ist jeden Tag offen. Er ist von Mittag bis zehn Uhr abends offen. Das ist bis Ende Dezember.

meaning 2 · grammar 2 · level 3 · glosses 5
- Missing facts: 'посетители' (visitors) and 'ручной работы' (handmade).
- 'bei der Roten Rathaus' is a severe gender error (should be 'beim').
- Using 'Sie können' repeatedly without introducing 'Besucher' beforehand leaves the pronoun without a logical antecedent.

**38-v2-b** (shown as D)

In Berlin gibt es einen neuen Weihnachtsmarkt am Roten Rathaus. Die Besucher können mit dem Riesenrad fahren. Sie können Glühwein trinken und handgemachte Geschenke kaufen. Der Markt ist jeden Tag von 12 Uhr bis 22 Uhr geöffnet. Er bleibt bis Ende Dezember offen.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**38-v2-a** (shown as E)

In Berlin gibt es einen neuen Weihnachtsmarkt am Roten Rathaus. Besucher können mit dem Riesenrad fahren. Sie können Glühwein trinken und handgemachte Geschenke kaufen. Der Markt ist jeden Tag von 12 Uhr bis 22 Uhr geöffnet. Er bleibt bis Ende Dezember da.

meaning 5 · grammar 4 · level 5 · glosses 5
- 'Er bleibt bis Ende Dezember da' is quite colloquial and unnatural for an event or market. 'Er bleibt ... offen/geöffnet' or 'Er findet ... statt' would be correct.

## 8. blog · A1-A2

> Сегодня я наконец сделала анмельдунг! Записаться в бюргерамт было сложно: свободных окошек не было три недели. Но сама встреча заняла всего десять минут. Сотрудница была очень вежливой, и я даже смогла сказать пару фраз по-немецки.

**lite31-v2-minimal** (shown as A)

Heute habe ich endlich die Anmeldung gemacht. Es war schwer, einen Termin beim Bürgeramt zu finden. Es gab drei Wochen lang keine Termine. Aber der Termin hat nur zehn Minuten gedauert. Die Mitarbeiterin war sehr freundlich. Ich habe sogar ein paar Sätze auf Deutsch gesagt.

meaning 4 · grammar 5 · level 5 · glosses 4
- Meaning: 'Ich habe sogar ein paar Sätze... gesagt' misses the nuance of 'смогла' (was able to / konnte).
- Glosses: The gloss for 'freundlich' is missing the '(in text: freundlich)' tag required by the app.

**lite35-v2-minimal** (shown as B)

Heute habe ich endlich die Anmeldung gemacht! Es war schwer, einen Termin im Bürgeramt zu bekommen. Es gab drei Wochen lang keine freien Termine. Aber der Termin hat nur zehn Minuten gedauert. Die Mitarbeiterin war sehr nett. Ich habe sogar ein paar Sätze auf Deutsch gesagt.

meaning 4 · grammar 5 · level 5 · glosses 3
- Meaning: 'Ich habe sogar... gesagt' loses the meaning of 'смогла' (konnte).
- Glosses: Missing the '(in text: ...)' tags for 'bekommen' and 'nett'.

**38-v2-a** (shown as C)

Heute habe ich endlich die Anmeldung gemacht! Einen Termin im Bürgeramt zu bekommen, war schwer. Drei Wochen lang gab es keine freien Termine. Aber der Termin selbst hat nur zehn Minuten gedauert. Die Mitarbeiterin war sehr höflich. Ich konnte sogar ein paar Sätze auf Deutsch sagen.

meaning 5 · grammar 4 · level 4 · glosses 3
- Grammar: 'im Bürgeramt' is less idiomatic than 'beim Bürgeramt'.
- LevelFit: 'Einen Termin im Bürgeramt zu bekommen, war schwer' (infinitive clause as a subject) is a bit unnatural and slightly advanced for A1-A2 compared to 'Es war schwer, einen Termin... zu bekommen'.
- Glosses: Missing the '(in text: ...)' tags for 'endlich' and 'höflich'.

**lite31-v2-low** (shown as D)

Heute habe ich mich endlich angemeldet! Es war schwer, einen Termin beim Bürgeramt zu bekommen. Es gab drei Wochen lang keine freien Termine. Aber das Gespräch hat nur zehn Minuten gedauert. Die Mitarbeiterin war sehr nett. Ich konnte sogar ein paar Sätze auf Deutsch sagen.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**38-v2-b** (shown as E)

Heute habe ich endlich die Anmeldung gemacht! Einen Termin im Bürgeramt zu bekommen, war schwer. Drei Wochen lang gab es keine freien Termine. Aber der Termin selbst hat nur zehn Minuten gedauert. Die Mitarbeiterin war sehr höflich. Ich habe sogar ein paar Sätze auf Deutsch gesagt.

meaning 4 · grammar 4 · level 4 · glosses 3
- Meaning: 'Ich habe sogar... gesagt' misses 'смогла' (konnte).
- Grammar/LevelFit: 'im Bürgeramt' instead of 'beim', and the infinitive clause as a subject is slightly advanced/clunky for A1-A2.
- Glosses: Missing the '(in text: ...)' tags for 'die Anmeldung' and 'höflich'.

## 9. blog · B1-B2

> Первые полгода в Германии я пыталась жить так же, как дома: искала привычные продукты, смотрела русские сериалы и общалась только с соотечественниками. В какой-то момент поняла, что так язык не выучу никогда. Тогда я записалась в хор при местной церкви — и это лучшее решение за весь год.

**lite35-v2-minimal** (shown as A)

In den ersten sechs Monaten in Deutschland habe ich versucht, genauso weiterzuleben wie zu Hause: Ich habe nach bekannten Produkten gesucht, russische Serien geschaut und mich nur mit Landsleuten unterhalten. Irgendwann habe ich verstanden, dass ich die Sprache auf diese Weise nie lernen werde. Da habe ich mich in einem Chor bei der örtlichen Kirche angemeldet – und das war die beste Entscheidung des ganzen Jahres.

meaning 4 · grammar 4 · level 3 · glosses 3
- "weiterzuleben" means "to continue living", which slightly alters the source meaning of "жить" (to live).
- "bekannten Produkten" is less natural for "привычные продукты" than "gewohnten Lebensmitteln".
- The selected glosses (versuchen, suchen, verstehen) are mostly A1/A2 level and too basic for a B1-B2 learner.
- The marked text for verbs in Perfekt (e.g., 'versucht', 'gesucht') misses the required auxiliary verb to form a complete grammatical unit.

**lite31-v2-minimal** (shown as B)

Die ersten sechs Monate in Deutschland habe ich versucht, genauso zu leben wie zu Hause. Ich habe nach vertrauten Lebensmitteln gesucht, russische Serien geschaut und mich nur mit Landsleuten unterhalten. Irgendwann wurde mir klar, dass ich die Sprache auf diese Weise niemals lernen würde. Also habe ich mich bei einem Chor in der lokalen Kirche angemeldet, und das war die beste Entscheidung des ganzen Jahres.

meaning 5 · grammar 4 · level 4 · glosses 2
- "bei einem Chor anmelden" is less natural than "in einem Chor anmelden" or "für einen Chor anmelden".
- The gloss for "klar" (ясный) ignores the context; it is part of the fixed phrase "jemandem klar werden" (понять), making the literal gloss unhelpful.
- The marked text for "sich anmelden" ('angemeldet') misses the reflexive pronoun and auxiliary verb.

**38-v2-b** (shown as C)

Das erste halbe Jahr in Deutschland versuchte ich, genauso wie zu Hause zu leben: Ich suchte nach gewohnten Lebensmitteln, schaute russische Serien und unterhielt mich nur mit Landsleuten. Irgendwann wurde mir klar, dass ich so die Sprache nie lernen würde. Da meldete ich mich im Chor der örtlichen Kirche an – und das war die beste Entscheidung des ganzen Jahres.

meaning 5 · grammar 5 · level 5 · glosses 4
- The marked text for "sich anmelden" ('meldete ich mich') misses the separable prefix 'an' located at the end of the sentence, which is part of the sensible lexical unit.

**lite31-v2-low** (shown as D)

Die ersten sechs Monate in Deutschland versuchte ich so zu leben wie zu Hause: Ich suchte nach gewohnten Produkten, schaute russische Serien und unterhielt mich nur mit meinen Landsleuten. Irgendwann verstand ich, dass ich so niemals die Sprache lernen würde. Also meldete ich mich bei einem Chor in der örtlichen Kirche an – und das war die beste Entscheidung des ganzen Jahres.

meaning 4 · grammar 4 · level 4 · glosses 4
- "mit meinen Landsleuten" unnecessarily adds the possessive pronoun "meinen" (my), which is not in the source text.
- "bei einem Chor anmelden" is slightly less natural than "in einem Chor anmelden".
- Missing comma before "so zu leben" makes the sentence structure slightly less readable.

**38-v2-a** (shown as E)

Das erste halbe Jahr in Deutschland versuchte ich, genauso wie zu Hause zu leben: Ich suchte nach gewohnten Lebensmitteln, schaute russische Serien und unterhielt mich nur mit Landsleuten. Irgendwann wurde mir klar, dass ich so die Sprache nie lernen würde. Da meldete ich mich im Chor der örtlichen Kirche an – und das war die beste Entscheidung des ganzen Jahres.

meaning 5 · grammar 5 · level 5 · glosses 3
- The marked text for "sich anmelden" is only 'meldete', which completely misses both the reflexive pronoun 'mich' and the separable prefix 'an'.

## 10. blog · A1-A2

> В Германии в воскресенье почти все магазины закрыты. Сначала меня это очень удивляло. Теперь я покупаю продукты в субботу, а в воскресенье гуляю в парке или хожу в гости. Оказалось, что один спокойный день в неделю — это очень приятно.

**38-v2-a** (shown as A)

In Deutschland sind am Sonntag fast alle Geschäfte geschlossen. Zuerst hat mich das sehr überrascht. Jetzt kaufe ich Lebensmittel am Samstag. Am Sonntag gehe ich im Park spazieren oder besuche Freunde. Ein ruhiger Tag in der Woche ist wirklich sehr schön.

meaning 5 · grammar 4 · level 5 · glosses 5
- Unnatural word order: 'kaufe ich Lebensmittel am Samstag' sounds clunky. Temporal adverbs should generally precede indefinite objects ('kaufe ich am Samstag Lebensmittel').

**lite31-v2-low** (shown as B)

In Deutschland sind am Sonntag fast alle Geschäfte geschlossen. Am Anfang hat mich das sehr gewundert. Jetzt kaufe ich meine Lebensmittel schon am Samstag ein. Am Sonntag gehe ich dann im Park spazieren oder besuche Freunde. Ich finde: Ein ruhiger Tag in der Woche ist sehr schön.

meaning 5 · grammar 5 · level 5 · glosses 3
- Gloss mismatch: 'sich wundern — удивляться' does not fit the text 'hat mich das gewundert', which uses the transitive 'wundern' (удивлять).
- Incomplete gloss: 'spazieren — гулять' misses 'gehen' (the correct full phrase used is 'spazieren gehen').

**38-v2-b** (shown as C)

In Deutschland sind am Sonntag fast alle Geschäfte geschlossen. Am Anfang hat mich das sehr gewundert. Jetzt kaufe ich Lebensmittel am Samstag. Am Sonntag gehe ich im Park spazieren oder besuche Freunde. Ein ruhiger Tag in der Woche ist wirklich sehr schön.

meaning 5 · grammar 4 · level 5 · glosses 4
- Unnatural word order: 'kaufe ich Lebensmittel am Samstag' (should be 'kaufe ich am Samstag Lebensmittel').
- Incomplete text marking: 'spazieren gehen — гулять' is correct, but only 'spazieren' is marked in the text, leaving 'gehen' out.

**lite31-v2-minimal** (shown as D)

In Deutschland sind am Sonntag fast alle Geschäfte geschlossen. Am Anfang hat mich das sehr gewundert. Jetzt kaufe ich am Samstag ein. Am Sonntag gehe ich in den Park oder besuche Freunde. Ein ruhiger Tag in der Woche ist sehr schön.

meaning 3 · grammar 5 · level 5 · glosses 3
- Meaning loss: 'kaufe ich am Samstag ein' translates to 'I shop on Saturday', losing the specific word for 'продукты' (Lebensmittel).
- Meaning loss: 'gehe ich in den Park' translates to 'I go to the park', losing the core activity of 'гуляю' (spazieren gehen).
- Gloss mismatch: 'sich wundern — удивляться' does not fit the transitive usage in the text 'hat mich das gewundert' (wundern — удивлять).

**lite35-v2-minimal** (shown as E)

In Deutschland sind am Sonntag fast alle Geschäfte geschlossen. Zuerst hat mich das sehr gewundert. Jetzt kaufe ich am Samstag Lebensmittel ein. Am Sonntag gehe ich in den Park oder ich besuche Freunde. Ein ruhiger Tag in der Woche ist sehr schön.

meaning 3 · grammar 5 · level 5 · glosses 2
- Meaning loss: 'gehe ich in den Park' loses the meaning of 'гуляю' (spazieren gehen).
- Gloss error: 'sich wundern — удивлять' is grammatically incorrect ('sich wundern' means 'удивляться').
- Gloss error: 'einkaufen — покупать продукты' is inaccurate ('einkaufen' means 'to shop', while 'Lebensmittel' handles 'продукты').
- Incomplete text marking: only 'kaufe' is marked for the separable verb 'einkaufen', leaving the prefix 'ein' out.

## 11. blog · B1-B2

> Многие жалуются на немецкую бюрократию, но у неё есть и плюсы. Если ты один раз правильно заполнил все формы, дальше система работает предсказуемо: письма приходят вовремя, сроки соблюдаются, а ответ всегда можно получить в письменном виде. Главное — не выбрасывать ни одного письма и завести отдельную папку для документов.

**lite31-v2-minimal** (shown as A)

Viele Leute beschweren sich über die deutsche Bürokratie, aber sie hat auch ihre Vorteile. Wenn man einmal alle Formulare richtig ausgefüllt hat, arbeitet das System danach sehr verlässlich: Briefe kommen pünktlich an, Fristen werden eingehalten und man bekommt immer eine schriftliche Antwort. Das Wichtigste ist, dass man keinen Brief wegwirft und einen eigenen Ordner für seine Dokumente anlegt.

meaning 4 · grammar 5 · level 5 · glosses 4
- Meaning changed slightly: 'verlässlich' means reliable, while the source 'предсказуемо' means predictable ('vorhersehbar').
- Gloss marking error: 'sich beschweren' is glossed, but only 'beschweren' is marked in the text, leaving out the reflexive pronoun.

**38-v2-b** (shown as B)

Viele beschweren sich über die deutsche Bürokratie, aber sie hat auch ihre Vorteile. Wenn man alle Formulare einmal richtig ausgefüllt hat, funktioniert das System danach vorhersehbar: Briefe kommen pünktlich an, Fristen werden eingehalten, und man bekommt eine Antwort immer schriftlich. Das Wichtigste ist, keinen einzigen Brief wegzuwerfen und einen eigenen Ordner für die Unterlagen anzulegen.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**lite31-v2-low** (shown as C)

Viele Menschen beschweren sich über die deutsche Bürokratie, aber sie hat auch ihre Vorteile. Wenn man einmal alle Formulare richtig ausgefüllt hat, funktioniert das System danach vorhersehbar: Briefe kommen pünktlich an, Fristen werden eingehalten und man kann eine Antwort immer schriftlich erhalten. Das Wichtigste ist, keinen einzigen Brief wegzuwerfen und einen eigenen Ordner für Unterlagen anzulegen.

meaning 5 · grammar 5 · level 5 · glosses 4
- Gloss error: the singular noun 'die Frist' is incorrectly translated with the plural Russian word 'сроки' (should be 'срок').

**lite35-v2-minimal** (shown as D)

Viele Leute beschweren sich über die deutsche Bürokratie, aber sie hat auch ihre Vorteile. Wenn man einmal alle Formulare richtig ausgefüllt hat, funktioniert das System danach vorhersehbar: Briefe kommen pünktlich an, Fristen werden eingehalten, und eine Antwort bekommt man immer schriftlich. Die Hauptsache ist, keinen einzigen Brief wegzufügen und einen separaten Ordner für Dokumente anzulegen.

meaning 4 · grammar 2 · level 4 · glosses 4
- Vocabulary error: 'wegzufügen' is not a valid German word in this context; it should be 'wegzuwerfen' (выбрасывать).
- Gloss marking error: 'sich beschweren' is glossed, but only 'beschweren' is marked in the text, omitting the reflexive pronoun.

**38-v2-a** (shown as E)

Viele beschweren sich über die deutsche Bürokratie, aber sie hat auch ihre Vorteile. Wenn man einmal alle Formulare richtig ausgefüllt hat, funktioniert das System danach vorhersehbar: Briefe kommen pünktlich an, Fristen werden eingehalten, und man bekommt eine Antwort immer schriftlich. Das Wichtigste ist, keinen einzigen Brief wegzuwerfen und sich einen eigenen Ordner für die Unterlagen anzulegen.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 12. blog · A1-A2

> Мой сын пошёл в немецкий детский сад три месяца назад. Первую неделю он плакал каждое утро. Сейчас он рассказывает мне про друзей, поёт немецкие песни и поправляет моё произношение. Дети учат язык намного быстрее, чем взрослые.

**lite31-v2-low** (shown as A)

Mein Sohn geht seit drei Monaten in einen deutschen Kindergarten. In der ersten Woche hat er jeden Morgen geweint. Jetzt erzählt er mir von seinen Freunden. Er singt deutsche Lieder. Er korrigiert meine Aussprache. Kinder lernen Sprachen viel schneller als Erwachsene.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**lite35-v2-minimal** (shown as B)

Mein Sohn ist vor drei Monaten in den deutschen Kindergarten gegangen. In der ersten Woche hat er jeden Morgen geweint. Jetzt erzählt er mir von Freunden, singt deutsche Lieder und korrigiert meine Aussprache. Kinder lernen Sprachen viel schneller als Erwachsene.

meaning 4 · grammar 3 · level 4 · glosses 4
- "ist vor drei Monaten in den deutschen Kindergarten gegangen" sounds like a single trip made three months ago rather than starting to attend; "geht seit" or "ist in den Kindergarten gekommen" is natural.
- The definite article in "in den deutschen Kindergarten" doesn't match the general statement of the source.
- The gloss for 'lernen' is missing the '(in text: ...)' reference.

**38-v2-a** (shown as C)

Mein Sohn geht seit drei Monaten in einen deutschen Kindergarten. In der ersten Woche hat er jeden Morgen geweint. Jetzt erzählt er mir von seinen Freunden. Er singt deutsche Lieder und korrigiert meine Aussprache. Kinder lernen eine Sprache viel schneller als Erwachsene.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**lite31-v2-minimal** (shown as D)

Mein Sohn geht seit drei Monaten in einen deutschen Kindergarten. In der ersten Woche hat er jeden Morgen geweint. Jetzt erzählt er mir von seinen Freunden. Er singt deutsche Lieder. Er korrigiert meine Aussprache. Kinder lernen eine Sprache viel schneller als Erwachsene.

meaning 5 · grammar 5 · level 5 · glosses 3
- The gloss "schnell — быстрее" incorrectly mixes the positive form (schnell = быстро) with the comparative translation (быстрее = schneller).

**38-v2-b** (shown as E)

Mein Sohn geht seit drei Monaten in einen deutschen Kindergarten. In der ersten Woche hat er jeden Morgen geweint. Jetzt erzählt er mir von seinen Freunden. Er singt deutsche Lieder und korrigiert meine Aussprache. Kinder lernen eine Sprache viel schneller als Erwachsene.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 13. blog · B1-B2

> Собеседование на немецком оказалось не таким страшным, как я себе представлял. Меня спросили о прошлом опыте, о том, почему я выбрал именно эту компанию, и как я справляюсь со стрессом. Сложнее всего было понимать быстрые вопросы с диалектом, поэтому я пару раз честно попросил повторить — и это никого не смутило.

**lite35-v2-minimal** (shown as A)

Das Vorstellungsgespräch auf Deutsch war gar nicht so schlimm, wie ich mir das vorgestellt hatte. Man hat mich nach meiner bisherigen Erfahrung gefragt, warum ich genau diese Firma ausgewählt habe und wie ich mit Stress umkehre. Am schwierigsten war es, die schnellen Fragen mit Dialekt zu verstehen, deshalb habe ich ein paar Mal ehrlich gebeten, das zu wiederholen — und das hat niemanden irritiert.

meaning 4 · grammar 2 · level 4 · glosses 5
- "mit Stress umkehre" is the wrong verb (should be "umgehe").
- "ehrlich gebeten" is missing the prepositional adverb "darum" ("darum gebeten").

**38-v2-a** (shown as B)

Das Vorstellungsgespräch auf Deutsch war gar nicht so schlimm, wie ich es mir vorgestellt hatte. Sie fragten mich nach meiner bisherigen Erfahrung, warum ich mich für genau dieses Unternehmen entschieden habe und wie ich mit Stress umgehe. Am schwierigsten war es, die schnellen Fragen im Dialekt zu verstehen, deshalb habe ich ein paar Mal ehrlich darum gebeten, sie zu wiederholen – und das hat niemanden gestört.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**38-v2-b** (shown as C)

Das Vorstellungsgespräch auf Deutsch war gar nicht so schlimm, wie ich es mir vorgestellt hatte. Sie fragten mich nach meiner bisherigen Erfahrung, warum ich mich für genau dieses Unternehmen entschieden habe und wie ich mit Stress umgehe. Am schwierigsten war es, die schnellen Fragen im Dialekt zu verstehen, deshalb habe ich ein paar Mal ehrlich darum gebeten, sie zu wiederholen – und das hat niemanden gestört.

meaning 5 · grammar 5 · level 5 · glosses 4
- Including the capitalized article in the text highlight "(in text: Das Vorstellungsgespräch)" is slightly imprecise when the lemma is "das Vorstellungsgespräch".

**lite31-v2-minimal** (shown as D)

Das Vorstellungsgespräch auf Deutsch war nicht so schlimm, wie ich es mir vorgestellt hatte. Man fragte mich nach meinen bisherigen Erfahrungen, warum ich ausgerechnet diese Firma gewählt habe und wie ich mit Stress umgehe. Am schwierigsten war es, die schnellen Fragen mit Dialekt zu verstehen. Deshalb habe ich ein paar Mal ehrlich darum gebeten, das Gesagte zu wiederholen – und das hat niemanden gestört.

meaning 5 · grammar 5 · level 5 · glosses 2
- Missing the '(in text: ...)' locator for the gloss 'ausgerechnet', which will break the app's highlighting.

**lite31-v2-low** (shown as E)

Das Vorstellungsgespräch auf Deutsch war gar nicht so schlimm, wie ich es mir vorgestellt hatte. Ich wurde nach meiner bisherigen Erfahrung gefragt, warum ich mich ausgerechnet für diese Firma entschieden habe und wie ich mit Stress umgehe. Am schwierigsten war es, die schnellen Fragen mit Dialekt zu verstehen. Deshalb habe ich ein paar Mal ehrlich gebeten, die Frage zu wiederholen — und das hat niemanden gestört.

meaning 4 · grammar 3 · level 5 · glosses 2
- Translated "вопросы" (plural) as "die Frage" (singular) in the second sentence.
- "ehrlich gebeten" is missing "darum".
- Missing the '(in text: ...)' locator for the gloss 'wiederholen'.

## 14. blog · A1-A2

> Летом мы впервые поехали на Балтийское море. Вода была холодная, но дети всё равно купались весь день. Вечером мы ели рыбные булочки в порту и смотрели на корабли. В следующем году хотим вернуться туда на целую неделю.

**38-v2-a** (shown as A)

Im Sommer sind wir zum ersten Mal an die Ostsee gefahren. Das Wasser war kalt, aber die Kinder haben trotzdem den ganzen Tag gebadet. Am Abend haben wir Fischbrötchen im Hafen gegessen und die Schiffe beobachtet. Nächstes Jahr wollen wir für eine ganze Woche wieder dorthin fahren.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**lite31-v2-minimal** (shown as B)

Im Sommer sind wir zum ersten Mal an die Ostsee gefahren. Das Wasser war kalt. Aber die Kinder haben den ganzen Tag gebadet. Am Abend haben wir Fischbrötchen im Hafen gegessen. Wir haben die Schiffe gesehen. Nächstes Jahr wollen wir wieder dorthin fahren. Wir wollen eine ganze Woche bleiben.

meaning 3 · grammar 5 · level 4 · glosses 5
- Missing translation for 'всё равно' (trotzdem).
- The verb 'gesehen' (saw) is used instead of 'beobachtet/angeschaut' (watched/looked at) for 'смотрели'.

**lite31-v2-low** (shown as C)

Im Sommer sind wir zum ersten Mal an die Ostsee gefahren. Das Wasser war kalt. Aber die Kinder haben den ganzen Tag gebadet. Am Abend haben wir Fischbrötchen im Hafen gegessen. Wir haben die Schiffe beobachtet. Nächstes Jahr wollen wir wieder für eine Woche dorthin fahren.

meaning 3 · grammar 5 · level 5 · glosses 5
- Missing translation for 'всё равно' (trotzdem).
- Missing translation for 'целую' (ganze).

**38-v2-b** (shown as D)

Im Sommer sind wir zum ersten Mal an die Ostsee gefahren. Das Wasser war kalt, aber die Kinder haben trotzdem den ganzen Tag gebadet. Am Abend haben wir Fischbrötchen im Hafen gegessen und die Schiffe beobachtet. Nächstes Jahr wollen wir für eine ganze Woche dorthin zurückfahren.

meaning 5 · grammar 5 · level 5 · glosses 4
- no errors listed

**lite35-v2-minimal** (shown as E)

Im Sommer sind wir zum ersten Mal an die Ostsee gefahren. Das Wasser war kalt, aber die Kinder haben trotzdem den ganzen Tag gebadet. Am Abend haben wir Fischbrötchen im Hafen gegessen und die Schiffe angeschaut. Nächstes Jahr wollen wir für eine ganze Woche dorthin zurückkommen.

meaning 4 · grammar 3 · level 5 · glosses 5
- Unnatural phrasing: 'dorthin zurückkommen'. 'Kommen' implies movement towards the speaker, but 'dorthin' implies movement away. It should be 'dorthin zurückkehren' or 'wieder dorthin fahren'.

## 15. forum · A1-A2

> Привет всем! Подскажите, пожалуйста, где в Дюссельдорфе можно недорого купить подержанный велосипед? В магазинах цены очень высокие. Может быть, есть хорошие сайты или блошиные рынки? Заранее спасибо!

**lite35-v2-minimal** (shown as A)

Hallo zusammen! Wo kann man in Düsseldorf günstig ein gebrautes Fahrrad kaufen? Die Preise in den Geschäften sind sehr hoch. Gibt es vielleicht gute Websites oder einen Flohmarkt? Vielen Dank im Voraus!

meaning 4 · grammar 2 · level 5 · glosses 2
- Typo in 'gebrautes' instead of 'gebrauchtes' (changes the meaning to 'brewed')

**lite31-v2-minimal** (shown as B)

Hallo zusammen! Ich suche ein gebrauchtes Fahrrad in Düsseldorf. Ich möchte nicht viel Geld ausgeben. Die neuen Fahrräder im Geschäft sind zu teuer. Gibt es gute Webseiten oder Flohmärkte für Fahrräder? Vielen Dank für eure Hilfe!

meaning 3 · grammar 5 · level 5 · glosses 5
- Added unsupported information: 'Ich möchte nicht viel Geld ausgeben'
- Changed 'prices are very high' to 'Die neuen Fahrräder im Geschäft sind zu teuer'
- Changed 'thanks in advance' to 'Vielen Dank für eure Hilfe'

**38-v2-a** (shown as C)

Hallo zusammen! Wo kann man in Düsseldorf günstig ein Fahrrad kaufen? Ich suche ein gebrauchtes Fahrrad. In den Geschäften sind die Preise sehr hoch. Gibt es vielleicht gute Websites oder Flohmärkte? Vielen Dank im Voraus!

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**38-v2-b** (shown as D)

Hallo zusammen! Wo kann man in Düsseldorf günstig ein gebrauchtes Fahrrad kaufen? In den Geschäften sind die Preise sehr hoch. Gibt es vielleicht gute Websites oder Flohmärkte? Vielen Dank im Voraus!

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**lite31-v2-low** (shown as E)

Hallo zusammen! Ich suche ein gebrauchtes Fahrrad in Düsseldorf. Wo kann ich günstig kaufen? Die Fahrräder im Laden sind zu teuer. Kennen Sie gute Internetseiten oder einen Flohmarkt? Vielen Dank für Ihre Hilfe!

meaning 3 · grammar 2 · level 4 · glosses 2
- Grammar error: 'Wo kann ich günstig kaufen?' is missing a direct object (e.g., 'eins')
- Register error: Inconsistent addressing, mixing informal 'Hallo zusammen' with formal 'Kennen Sie'
- Meaning changed: Translated 'thanks in advance' as 'Vielen Dank für Ihre Hilfe'

## 16. forum · B1-B2

> Пришло письмо из налоговой с требованием подать декларацию за прошлый год, хотя я работаю по найму и думал, что мне это не нужно. Оказалось, что из-за смены работы посреди года и пособия по безработице декларация обязательна. Кто-нибудь пользовался программами вроде ELSTER без помощи консультанта? Насколько это сложно?

**lite31-v2-low** (shown as A)

Ich habe einen Brief vom Finanzamt bekommen. Darin steht, dass ich meine Steuererklärung für letztes Jahr einreichen muss. Eigentlich dachte ich, das wäre nicht nötig, da ich angestellt bin. Aber weil ich mitten im Jahr den Job gewechselt habe und Arbeitslosengeld bezogen habe, ist die Steuererklärung jetzt Pflicht. Hat jemand von euch schon einmal Programme wie ELSTER ohne Steuerberater benutzt? Wie kompliziert ist das?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**lite35-v2-minimal** (shown as B)

Ich habe einen Brief vom Finanzamt bekommen, in dem ich aufgefordert werde, meine Steuererklärung für das letzte Jahr abzugeben, obwohl ich angestellt bin und dachte, dass ich das nicht muss. Es hat sich herausgestellt, dass die Erklärung wegen des Jobwechsels mitten im Jahr und des Arbeitslosengeldes Pflicht ist. Hat jemand von euch Programme wie ELSTER ohne Steuerberater genutzt? Wie schwer ist das?

meaning 5 · grammar 5 · level 5 · glosses 4
- The word 'der Brief' is A1 level and too basic to be glossed for a B1-B2 learner.

**38-v2-a** (shown as C)

Ich habe einen Brief vom Finanzamt bekommen, in dem ich aufgefordert werde, eine Steuererklärung für das letzte Jahr abzugeben. Eigentlich bin ich angestellt und dachte, dass ich das gar nicht machen muss. Es stellte sich jedoch heraus, dass die Erklärung wegen meines Jobwechsels mitten im Jahr und wegen des Arbeitslosengeldes Pflicht ist. Hat jemand von euch schon mal Programme wie ELSTER ohne die Hilfe eines Steuerberaters genutzt? Wie kompliziert ist das wirklich?

meaning 5 · grammar 5 · level 5 · glosses 3
- The marked text for the gloss 'sich herausstellen' is only 'stellte sich', which misses the separable prefix 'heraus' and is therefore an incomplete unit.

**lite31-v2-minimal** (shown as D)

Ich habe einen Brief vom Finanzamt bekommen, in dem ich aufgefordert werde, eine Steuererklärung für das letzte Jahr abzugeben. Eigentlich dachte ich, dass ich das nicht muss, weil ich angestellt bin. Es hat sich aber herausgestellt, dass die Erklärung Pflicht ist, weil ich im Laufe des Jahres den Job gewechselt habe und Arbeitslosengeld bezogen habe. Hat jemand von euch schon einmal Programme wie ELSTER ohne die Hilfe eines Steuerberaters genutzt? Wie kompliziert ist das?

meaning 4 · grammar 5 · level 5 · glosses 4
- The phrase 'im Laufe des Jahres' means 'during the year', which slightly changes the meaning of 'посреди года' (mitten im Jahr).
- The gloss for 'angestellt' is given as a noun ('наемный работник'), but it functions as an adjective/participle in the sentence ('weil ich angestellt bin').

**38-v2-b** (shown as E)

Ich habe einen Brief vom Finanzamt bekommen, in dem ich aufgefordert werde, eine Steuererklärung für das letzte Jahr abzugeben. Eigentlich bin ich angestellt und dachte, dass ich das gar nicht machen muss. Es hat sich aber herausgestellt, dass die Erklärung wegen meines Jobwechsels mitten im Jahr und wegen des Arbeitslosengeldes Pflicht ist. Hat jemand schon mal Programme wie ELSTER ohne die Hilfe von einem Steuerberater genutzt? Wie kompliziert ist das?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 17. forum · A1-A2

> У нас в квартире уже неделю не работает отопление. Я написала хаусферверальтунгу два раза, но ответа нет. Что мне делать? Могу ли я платить меньше аренды, пока не починят?

**38-v2-a** (shown as A)

In unserer Wohnung funktioniert die Heizung seit einer Woche nicht. Ich habe der Hausverwaltung schon zwei Mal geschrieben. Aber es gibt keine Antwort. Was soll ich tun? Kann ich weniger Miete zahlen, bis die Heizung repariert ist?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**lite31-v2-low** (shown as B)

In meiner Wohnung ist die Heizung seit einer Woche kaputt. Ich habe der Hausverwaltung schon zwei E-Mails geschrieben. Aber ich habe keine Antwort bekommen. Was soll ich tun? Darf ich weniger Miete bezahlen, bis die Heizung wieder funktioniert?

meaning 3 · grammar 5 · level 5 · glosses 5
- "In meiner Wohnung" changes the meaning of "У нас в квартире" (should be "In unserer Wohnung").
- "zwei E-Mails" invents facts not present in the source (should be "zwei Mal" or "zweimal").

**38-v2-b** (shown as C)

In unserer Wohnung funktioniert die Heizung schon seit einer Woche nicht. Ich habe der Hausverwaltung zweimal geschrieben, aber keine Antwort bekommen. Was soll ich tun? Kann ich weniger Miete zahlen, bis die Heizung repariert ist?

meaning 5 · grammar 5 · level 5 · glosses 3
- Gloss marker error: "keine Antwort" is marked for the gloss "die Antwort", which incorrectly includes the negation.
- Gloss marker error: "der Hausverwaltung" includes the inflected dative article for the nominative gloss "die Hausverwaltung".
- Missing in-text reference for the gloss "die Heizung".

**lite31-v2-minimal** (shown as D)

Die Heizung in meiner Wohnung funktioniert seit einer Woche nicht. Ich habe zweimal an die Hausverwaltung geschrieben. Aber ich bekomme keine Antwort. Was soll ich tun? Kann ich weniger Miete bezahlen, bis sie die Heizung reparieren?

meaning 4 · grammar 5 · level 5 · glosses 5
- "in meiner Wohnung" changes the meaning of "У нас в квартире" (should be "in unserer Wohnung").

**lite35-v2-minimal** (shown as E)

In unserer Wohnung funktioniert die Heizung seit einer Woche nicht. Ich habe dem Hausverwalter zweimal geschrieben, aber es gibt keine Antwort. Was soll ich machen? Kann ich weniger Miete bezahlen, bis sie das Problem reparieren?

meaning 4 · grammar 4 · level 5 · glosses 5
- "dem Hausverwalter" changes the entity from a company/administration to a male person (should be "der Hausverwaltung").
- "das Problem reparieren" is a lexical/collocation error (problems are solved "lösen", things are repaired "die Heizung reparieren").

## 18. forum · B1-B2

> Хочу сменить больничную кассу: моя повысила дополнительный взнос, а услуги остались прежними. Насколько я понимаю, при повышении взноса есть особое право на расторжение договора. Подскажите, нужно ли сначала найти новую кассу или можно сразу отправить заявление старой?

**lite31-v2-low** (shown as A)

Ich möchte meine Krankenkasse wechseln: Meine hat den Zusatzbeitrag erhöht, aber die Leistungen sind gleich geblieben. Soweit ich weiß, habe ich bei einer Beitragserhöhung ein Sonderkündigungsrecht. Könnt ihr mir sagen, ob ich zuerst eine neue Krankenkasse finden muss oder ob ich der alten einfach schon einmal kündigen kann?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**lite31-v2-minimal** (shown as B)

Ich möchte meine Krankenkasse wechseln: Meine hat den Zusatzbeitrag erhöht, aber die Leistungen sind gleich geblieben. Soweit ich weiß, gibt es bei einer Beitragserhöhung ein Sonderkündigungsrecht. Könnt ihr mir sagen, ob ich zuerst eine neue Kasse finden muss oder ob ich direkt die Kündigung an die alte schicken kann?

meaning 5 · grammar 5 · level 5 · glosses 4
- The gloss for 'die Kündigung' includes 'увольнении', which does not fit the context of health insurance.

**38-v2-a** (shown as C)

Ich möchte meine Krankenkasse wechseln: Meine aktuelle hat den Zusatzbeitrag erhöht, aber die Leistungen sind gleich geblieben. Soweit ich weiß, hat man bei einer Beitragserhöhung ein Sonderkündigungsrecht. Könnt ihr mir sagen, ob ich zuerst eine neue Kasse finden muss oder ob ich sofort die Kündigung an die alte schicken kann?

meaning 5 · grammar 5 · level 5 · glosses 3
- The gloss for 'die Kündigung' includes 'увольнение' and 'die Leistung' includes 'выплата', which do not fit the specific context here.

**lite35-v2-minimal** (shown as D)

Ich möchte meine Krankenkasse wechseln: Meine hat den Zusatzbeitrag erhöht, aber die Leistungen sind gleich geblieben. Soweit ich weiß, gibt es bei einer Beitragserhöhung ein Sonderkündigungsrecht. Können Sie mir sagen, ob ich zuerst eine neue Kasse finden muss oder ob ich gleich die Kündigung an die alte schicken kann?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**38-v2-b** (shown as E)

Ich möchte meine Krankenkasse wechseln: Meine aktuelle hat den Zusatzbeitrag erhöht, aber die Leistungen sind gleich geblieben. Soviel ich weiß, hat man bei einer Erhöhung des Beitrags ein Sonderkündigungsrecht. Könnt ihr mir sagen, ob ich zuerst eine neue Kasse finden muss oder ob ich der alten direkt kündigen kann?

meaning 5 · grammar 5 · level 5 · glosses 3
- The gloss for 'kündigen' includes 'увольнять' and 'die Leistung' includes 'выплата', which do not fit the context.

## 19. forum · A1-A2

> Кто знает хорошие бесплатные курсы немецкого в Гамбурге? Я работаю днём, поэтому мне нужны вечерние занятия. Мой уровень сейчас примерно A2. Буду рада любым советам!

**38-v2-b** (shown as A)

Wer kennt gute kostenlose Deutschkurse in Hamburg? Ich arbeite am Tag, deshalb brauche ich Unterricht am Abend. Mein Niveau ist jetzt ungefähr A2. Ich freue mich über jeden Tipp!

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**38-v2-a** (shown as B)

Wer kennt gute kostenlose Deutschkurse in Hamburg? Ich arbeite am Tag. Deshalb brauche ich Unterricht am Abend. Mein Niveau ist jetzt ungefähr A2. Ich freue mich über jeden Tipp!

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**lite31-v2-low** (shown as C)

Wer kennt gute kostenlose Deutschkurse in Hamburg? Ich arbeite am Tag. Deshalb brauche ich Kurse am Abend. Mein Sprachniveau ist aktuell A2. Ich freue mich über Tipps!

meaning 4 · grammar 5 · level 5 · glosses 5
- Missing translation for 'примерно' (ungefähr)
- Missing translation for 'любым' (jeden)

**lite31-v2-minimal** (shown as D)

Wer kennt gute kostenlose Deutschkurse in Hamburg? Ich arbeite am Tag. Deshalb brauche ich Abendkurse. Mein Niveau ist jetzt ungefähr A2. Ich freue mich über jeden Tipp!

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**lite35-v2-minimal** (shown as E)

Wer kennt gute, kostenlose Deutschkurse in Hamburg? Ich arbeite tagsüber. Darum brauche ich Abendkurse. Mein Niveau ist jetzt ungefähr A2. Ich freue mich über jeden Tipp!

meaning 5 · grammar 5 · level 5 · glosses 4
- The gloss for 'sich freuen' incorrectly quotes only 'freue' from the text instead of the full reflexive unit 'freue mich'

## 20. forum · B1-B2

> Соседи сверху регулярно устраивают шумные вечеринки после десяти вечера, хотя в правилах дома прописан ночной покой. Разговор с ними ничего не дал. Стоит ли сразу писать управляющей компании или сначала вести протокол шума, чтобы потом были доказательства?

**lite31-v2-low** (shown as A)

Meine Nachbarn über mir machen regelmäßig laute Partys nach 22 Uhr, obwohl in der Hausordnung die Nachtruhe steht. Ein Gespräch mit ihnen hat nichts gebracht. Sollte ich sofort die Hausverwaltung kontaktieren oder erst ein Lärmprotokoll führen, damit ich später Beweise habe?

meaning 5 · grammar 3 · level 3 · glosses 5
- "machen ... Partys" (Too colloquial for B1-B2; 'feiern' or 'veranstalten' is expected.)
- "laute Partys nach 22 Uhr" (Word order flaw: the temporal adverbial 'nach 22 Uhr' should precede the direct object 'laute Partys' according to the TeKaMoLo rule.)
- "die Nachtruhe steht" (A bit too colloquial; 'festgelegt ist' or 'vorgeschrieben ist' fits a formal rulebook better.)

**38-v2-a** (shown as B)

Die Nachbarn über mir feiern regelmäßig laute Partys nach 22 Uhr, obwohl in der Hausordnung die Nachtruhe festgelegt ist. Ein Gespräch mit ihnen hat nichts gebracht. Lohnt es sich, sofort der Hausverwaltung zu schreiben, oder sollte man zuerst ein Lärmprotokoll führen, um später Beweise zu haben?

meaning 5 · grammar 4 · level 5 · glosses 5
- "laute Partys nach 22 Uhr" (Word order flaw: placing the temporal adverbial 'nach 22 Uhr' after the direct object is common in spoken language, but B1-B2 writing requires 'regelmäßig nach 22 Uhr laute Partys feiern'.)

**lite35-v2-minimal** (shown as C)

Die Nachbarn oben feiern regelmäßig nach zehn Uhr abends laute Partys, obwohl in der Hausordnung die Nachtruhe steht. Ein Gespräch mit ihnen hat nichts gebracht. Lohnt es sich, sofort der Hausverwaltung zu schreiben oder erst ein Lärmprotokoll zu führen, damit es später Beweise gibt?

meaning 5 · grammar 5 · level 4 · glosses 4
- "die Nachtruhe steht" (Stylistically slightly informal for B1-B2.)
- Gloss formatting: The gloss for "feiern" is missing the "(in text: ...)" mapping present in all other entries.

**38-v2-b** (shown as D)

Die Nachbarn über mir feiern regelmäßig laute Partys nach zweiundzwanzig Uhr, obwohl in der Hausordnung eine Nachtruhe festgelegt ist. Ein Gespräch mit ihnen hat leider gar nichts gebracht. Sollte ich mich direkt an die Hausverwaltung wenden oder zuerst ein Lärmprotokoll führen, damit ich später Beweise habe?

meaning 4 · grammar 3 · level 4 · glosses 5
- "leider gar nichts" (Adds subjective emphasis 'unfortunately absolutely' that is not in the source.)
- "eine Nachtruhe" (Wrong article; an established concept like this takes the definite article 'die Nachtruhe'.)
- "zweiundzwanzig Uhr" (It is highly unnatural to spell out numbers above twelve for times in this context; '22 Uhr' is standard.)
- "laute Partys nach zweiundzwanzig Uhr" (Word order flaw: temporal adverbial should precede the direct object.)

**lite31-v2-minimal** (shown as E)

Meine Nachbarn über mir veranstalten regelmäßig laute Partys nach zehn Uhr abends, obwohl die Hausordnung die Nachtruhe vorschreibt. Ein Gespräch mit ihnen hat leider nichts gebracht. Sollte ich mich sofort an die Hausverwaltung wenden oder erst ein Lärmprotokoll führen, damit ich später Beweise habe?

meaning 4 · grammar 4 · level 5 · glosses 4
- "leider nichts" (Adds the subjective word 'leider', which is not present in the Russian source.)
- "laute Partys nach zehn Uhr abends" (Word order flaw: temporal adverbial should precede the direct object.)
- Gloss formatting: The gloss for "veranstalten" is missing the "(in text: ...)" mapping.
