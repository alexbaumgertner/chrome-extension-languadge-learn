# Model judge report

- Date: 2026-10-19T11:38:34.624Z
- Judge: `gemini-3.1-pro-preview` (blind, shuffled letters; same model family as candidates — spot-check)
- Paragraphs: 20

| Model | Overall | Meaning | Grammar | Level fit | Glosses | $/paragraph | Avg latency | Judged |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `38-prompt-v2` | 4.89 | 4.80 | 4.90 | 5.00 | 4.85 | 0.00156 | 3507 ms | 20/20 |
| `38-prompt-v1` | 4.59 | 4.85 | 4.75 | 4.95 | 3.80 | 0.00116 | 3149 ms | 20/20 |

## 1. news · A1-A2

> В понедельник в Германии снова бастуют машинисты поездов. Профсоюз GDL призвал своих членов прекратить работу с двух часов ночи до вечера вторника. Deutsche Bahn советует пассажирам по возможности перенести поездки и заранее проверять расписание в приложении.

**38-prompt-v1** (shown as A)

Am Montag streiken in Deutschland wieder die Lokführer. Die Gewerkschaft GDL ruft ihre Mitglieder zum Streik auf. Die Arbeit stoppt von zwei Uhr nachts bis Dienstagabend. Die Deutsche Bahn rät den Fahrgästen: Verschieben Sie Ihre Reisen. Prüfen Sie den Fahrplan vorher in der App.

meaning 4 · grammar 4 · level 5 · glosses 4
- Missing translation for 'по возможности' (if possible).
- 'Die Arbeit stoppt' is slightly unnatural for a strike; 'Die Arbeit ruht' or 'Sie arbeiten nicht' would be better German.

**38-prompt-v2** (shown as B)

Am Montag streiken in Deutschland wieder die Lokführer. Die Gewerkschaft GDL hat dazu aufgerufen. Die Lokführer arbeiten von zwei Uhr nachts bis Dienstagabend nicht. Die Deutsche Bahn gibt den Fahrgästen einen Tipp: Bitte verschieben Sie Ihre Reise, wenn das geht. Prüfen Sie auch vorher den Fahrplan in der App.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 2. news · B1-B2

> Бундестаг принял закон, который упрощает получение гражданства. Теперь подать заявление можно уже через пять лет проживания в стране, а при особых успехах в интеграции — через три года. Кроме того, двойное гражданство больше не будет исключением: новым гражданам не придётся отказываться от прежнего паспорта.

**38-prompt-v2** (shown as A)

Der Bundestag hat ein neues Gesetz beschlossen, das die Einbürgerung deutlich vereinfacht. Ab jetzt kann man den Antrag schon nach fünf Jahren Aufenthalt im Land stellen, und bei besonderen Integrationsleistungen sogar schon nach drei Jahren. Außerdem wird die doppelte Staatsbürgerschaft keine Ausnahme mehr sein: Neue Staatsbürger müssen ihren bisherigen Pass nicht mehr abgeben.

meaning 4 · grammar 5 · level 5 · glosses 5
- Added 'neues' in 'ein neues Gesetz' (source just says 'закон')
- Added 'deutlich' in 'deutlich vereinfacht' (source just says 'упрощает')

**38-prompt-v1** (shown as B)

Der Bundestag hat ein Gesetz beschlossen, das die Einbürgerung vereinfacht. Ab jetzt kann man den Antrag schon nach fünf Jahren Aufenthalt im Land stellen, und bei besonderen Integrationsleistungen sogar nach drei Jahren. Außerdem wird die doppelte Staatsbürgerschaft keine Ausnahme mehr sein: Neue Staatsbürger müssen ihren bisherigen Pass nicht mehr abgeben.

meaning 5 · grammar 5 · level 5 · glosses 3
- Inconsistent dictionary forms in glosses: verbs are provided in conjugated or participle forms ('beschlossen', 'vereinfacht') instead of infinitives.
- Inconsistent use of articles in noun glosses: missing for 'Einbürgerung', 'Aufenthalt', 'Ausnahme', but included in the accusative for 'den Antrag'.

## 3. news · A1-A2

> С января стоимость проездного Deutschlandticket выросла до 63 евро в месяц. Билет по-прежнему действует во всех автобусах, трамваях и региональных поездах по всей стране. Скоростные поезда ICE и IC в него не входят.

**38-prompt-v2** (shown as A)

Seit Januar kostet das Deutschlandticket 63 Euro im Monat. Der Preis ist gestiegen. Das Ticket gilt immer noch in ganz Deutschland. Man kann damit alle Busse, Straßenbahnen und Regionalzüge nutzen. Schnelle Züge wie ICE oder IC gehören nicht dazu.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**38-prompt-v1** (shown as B)

Seit Januar kostet das Deutschlandticket 63 Euro im Monat. Der Preis ist gestiegen. Die Fahrkarte gilt weiter in ganz Deutschland. Man kann damit alle Busse, Straßenbahnen und Regionalzüge nutzen. Schnelle Züge wie der ICE oder der IC gehören nicht dazu.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 4. news · B1-B2

> Арендная плата в крупных немецких городах продолжает расти. По данным исследовательского института, за последний год средняя цена квадратного метра в Мюнхене поднялась почти на семь процентов. Эксперты связывают это с нехваткой нового жилья и высокими процентными ставками, из-за которых многие откладывают покупку квартиры.

**38-prompt-v1** (shown as A)

Die Mieten in großen deutschen Städten steigen immer weiter. Nach Angaben eines Forschungsinstituts ist der durchschnittliche Quadratmeterpreis in München im vergangenen Jahr um fast sieben Prozent gestiegen. Experten führen das auf den Mangel an neuem Wohnraum und auf die hohen Zinsen zurück, wegen derer viele Menschen den Kauf einer Wohnung verschieben.

meaning 5 · grammar 4 · level 5 · glosses 3
- The relative pronoun in the genitive plural should be 'deren', not 'derer' ('wegen deren' or 'weswegen').
- The gloss 'führen das auf' is incomplete and misses the essential separable prefix 'zurück'.

**38-prompt-v2** (shown as B)

Die Mieten in den deutschen Großstädten steigen weiter an. Laut einem Forschungsinstitut ist der durchschnittliche Quadratmeterpreis in München im vergangenen Jahr um fast sieben Prozent gestiegen. Experten führen das auf den Mangel an neuen Wohnungen und die hohen Zinsen zurück, weshalb viele Menschen den Kauf einer Wohnung verschieben.

meaning 5 · grammar 5 · level 5 · glosses 4
- The gloss for 'zurückführen' only marks 'führen' in the text, leaving out the separable prefix 'zurück' which is necessary for the meaning.

## 5. news · A1-A2

> Метеорологи предупреждают о сильной жаре на юге Германии. В выходные температура может подняться до 36 градусов. Врачи советуют пить больше воды, не выходить на солнце в обед и чаще проведывать пожилых соседей.

**38-prompt-v2** (shown as A)

Wetter-Experten warnen vor großer Hitze im Süden von Deutschland. Am Wochenende kann die Temperatur bis auf 36 Grad steigen. Ärzte geben wichtige Tipps: Die Menschen sollen viel Wasser trinken und mittags nicht in die Sonne gehen. Man soll auch ältere Nachbarn besuchen und ihnen helfen.

meaning 3 · grammar 5 · level 5 · glosses 5
- Omitted the comparative 'чаще' (öfter/häufiger) when translating 'чаще проведывать'.
- Added 'und ihnen helfen', which is not in the source text.
- Changed 'больше воды' (mehr Wasser) to 'viel Wasser' (много воды).

**38-prompt-v1** (shown as B)

Meteorologen warnen vor großer Hitze im Süden von Deutschland. Am Wochenende kann die Temperatur bis auf 36 Grad steigen. Ärzte raten: Trinken Sie mehr Wasser. Gehen Sie am Mittag nicht in die Sonne. Besuchen Sie auch öfter ältere Nachbarn.

meaning 5 · grammar 5 · level 5 · glosses 4
- Several glosses ('großer Hitze', 'ältere Nachbarn', 'raten — советуют') use inflected phrases and conjugated verbs instead of base forms (lemmas), which is less ideal for vocabulary learning.

## 6. news · B1-B2

> Федеральное агентство по труду сообщило, что число открытых вакансий для специалистов в сфере ухода за больными снова увеличилось. Особенно не хватает медсестёр в домах престарелых. Правительство надеется привлечь больше работников из-за рубежа и ускорить признание иностранных дипломов.

**38-prompt-v2** (shown as A)

Die Bundesagentur für Arbeit hat mitgeteilt, dass die Zahl der offenen Stellen für Pflegekräfte wieder gestiegen ist. Besonders in den Altenheimen fehlen viele Pflegekräfte. Die Regierung hofft nun, mehr Arbeitskräfte aus dem Ausland anzulocken und die Anerkennung von ausländischen Abschlüssen zu beschleunigen.

meaning 5 · grammar 4 · level 5 · glosses 5
- The verb 'anzulocken' (to lure/entice) is stylistically inappropriate for recruiting workers; the correct term is 'anzuwerben' or 'zu gewinnen'.

**38-prompt-v1** (shown as B)

Die Bundesagentur für Arbeit hat mitgeteilt, dass die Zahl der offenen Stellen für Pflegekräfte wieder gestiegen ist. Besonders in Altenheimen fehlen viele Fachkräfte. Die Regierung hofft nun, mehr Arbeitskräfte aus dem Ausland anzuwerben und die Anerkennung ausländischer Abschlüsse zu beschleunigen.

meaning 5 · grammar 5 · level 5 · glosses 3
- Nouns in glosses are given in their inflected forms without definite articles (e.g., 'Altenheimen', 'Abschlüsse') instead of the standard base forms (e.g., 'das Altenheim', 'der Abschluss').
- Verb glosses unnecessarily include auxiliary verbs or particles (e.g., 'hat mitgeteilt', 'zu beschleunigen') instead of just the infinitive ('mitteilen', 'beschleunigen').

## 7. news · A1-A2

> В Берлине открылся новый рождественский рынок у Красной ратуши. Посетители могут покататься на колесе обозрения, попробовать глинтвейн и купить подарки ручной работы. Рынок работает каждый день с полудня до десяти вечера до конца декабря.

**38-prompt-v2** (shown as A)

In Berlin gibt es einen neuen Weihnachtsmarkt am Roten Rathaus. Die Besucher können mit dem Riesenrad fahren. Sie können Glühwein trinken und handgemachte Geschenke kaufen. Der Markt ist jeden Tag von zwölf Uhr mittags bis zweiundzwanzig Uhr abends geöffnet. Er bleibt bis Ende Dezember offen.

meaning 5 · grammar 4 · level 5 · glosses 5
- "zweiundzwanzig Uhr abends" is redundant and unnatural; it should be either "22 Uhr" or "zehn Uhr abends"

**38-prompt-v1** (shown as B)

In Berlin gibt es einen neuen Weihnachtsmarkt am Roten Rathaus. Besucher können Riesenrad fahren, Glühwein trinken und handgemachte Geschenke kaufen. Der Markt ist jeden Tag von 12 Uhr bis 22 Uhr geöffnet. Er bleibt bis Ende Dezember offen.

meaning 5 · grammar 5 · level 5 · glosses 4
- Nouns in the glosses are missing their definite articles (it should be 'der Weihnachtsmarkt', 'die Besucher', etc., which is essential for German learners)

## 8. blog · A1-A2

> Сегодня я наконец сделала анмельдунг! Записаться в бюргерамт было сложно: свободных окошек не было три недели. Но сама встреча заняла всего десять минут. Сотрудница была очень вежливой, и я даже смогла сказать пару фраз по-немецки.

**38-prompt-v1** (shown as A)

Heute habe ich endlich meine Anmeldung gemacht! Einen Termin beim Bürgeramt zu bekommen, war schwer. Drei Wochen lang gab es keine freien Termine. Aber der Termin selbst hat nur zehn Minuten gedauert. Die Mitarbeiterin war sehr höflich. Ich konnte sogar ein paar Sätze auf Deutsch sagen.

meaning 5 · grammar 5 · level 5 · glosses 4
- Glosses for nouns (Anmeldung, Termin, Bürgeramt) lack their definite articles. In German, nouns should always be learned with their articles.

**38-prompt-v2** (shown as B)

Heute habe ich endlich die Anmeldung gemacht! Es war schwer, einen Termin im Bürgeramt zu bekommen. Drei Wochen lang gab es keine freien Termine. Aber der Termin selbst hat nur zehn Minuten gedauert. Die Mitarbeiterin war sehr höflich. Ich konnte sogar ein paar Sätze auf Deutsch sagen.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 9. blog · B1-B2

> Первые полгода в Германии я пыталась жить так же, как дома: искала привычные продукты, смотрела русские сериалы и общалась только с соотечественниками. В какой-то момент поняла, что так язык не выучу никогда. Тогда я записалась в хор при местной церкви — и это лучшее решение за весь год.

**38-prompt-v2** (shown as A)

Das erste halbe Jahr in Deutschland versuchte ich, genauso wie zu Hause zu leben: Ich suchte nach gewohnten Lebensmitteln, schaute russische Serien und unterhielt mich nur mit Landsleuten. Irgendwann wurde mir klar, dass ich so die Sprache nie lernen würde. Da meldete ich mich beim Kirchenchor der Gemeinde an – und das war die beste Entscheidung des ganzen Jahres.

meaning 5 · grammar 5 · level 5 · glosses 4
- In the glosses, the text reference for 'sich anmelden' only points to 'meldete' and misses the separable prefix 'an'.

**38-prompt-v1** (shown as B)

Das erste halbe Jahr in Deutschland habe ich versucht, genauso wie zu Hause zu leben: Ich suchte nach gewohnten Lebensmitteln, schaute russische Serien und unterhielt mich nur mit Landsleuten. Irgendwann wurde mir klar, dass ich so die Sprache nie lernen würde. Da meldete ich mich im Chor der örtlichen Kirchengemeinde an – und das war die beste Entscheidung des ganzen Jahres.

meaning 5 · grammar 3 · level 4 · glosses 2
- Inconsistent tenses: the text starts with Perfekt ('habe ich versucht') but immediately switches to Präteritum ('suchte', 'schaute', 'unterhielt') for the rest of the narrative, which is poor style.
- The glosses provide inflected forms and conjugated phrases (e.g., 'gewohnten', 'Landsleuten', 'unterhielt mich', 'meldete ich mich') instead of base dictionary forms (nominative/infinitive), which is an ineffective way to teach vocabulary.

## 10. blog · A1-A2

> В Германии в воскресенье почти все магазины закрыты. Сначала меня это очень удивляло. Теперь я покупаю продукты в субботу, а в воскресенье гуляю в парке или хожу в гости. Оказалось, что один спокойный день в неделю — это очень приятно.

**38-prompt-v1** (shown as A)

In Deutschland sind am Sonntag fast alle Geschäfte geschlossen. Am Anfang hat mich das sehr gewundert. Jetzt kaufe ich Lebensmittel am Samstag. Am Sonntag gehe ich im Park spazieren oder besuche Freunde. Ein ruhiger Tag in der Woche ist wirklich sehr schön.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**38-prompt-v2** (shown as B)

In Deutschland sind am Sonntag fast alle Geschäfte geschlossen. Am Anfang hat mich das sehr überrascht. Jetzt kaufe ich Lebensmittel am Samstag. Am Sonntag gehe ich im Park spazieren oder besuche Freunde. Ein ruhiger Tag in der Woche ist wirklich sehr schön.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 11. blog · B1-B2

> Многие жалуются на немецкую бюрократию, но у неё есть и плюсы. Если ты один раз правильно заполнил все формы, дальше система работает предсказуемо: письма приходят вовремя, сроки соблюдаются, а ответ всегда можно получить в письменном виде. Главное — не выбрасывать ни одного письма и завести отдельную папку для документов.

**38-prompt-v2** (shown as A)

Viele beschweren sich über die deutsche Bürokratie, aber sie hat auch Vorteile. Wenn man alle Formulare einmal richtig ausgefüllt hat, funktioniert das System danach vorhersehbar: Briefe kommen pünktlich an, Fristen werden eingehalten und eine Antwort bekommt man immer schriftlich. Das Wichtigste ist, keinen einzigen Brief wegzuwerfen und einen eigenen Ordner für alle Unterlagen anzulegen.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**38-prompt-v1** (shown as B)

Viele beschweren sich über die deutsche Bürokratie, aber sie hat auch Vorteile. Wenn man alle Formulare einmal richtig ausgefüllt hat, funktioniert das System danach vorhersehbar: Briefe kommen pünktlich an, Fristen werden eingehalten und man bekommt immer eine schriftliche Antwort. Das Wichtigste ist, keinen einzigen Brief wegzuwerfen und einen eigenen Ordner für die Unterlagen anzulegen.

meaning 5 · grammar 5 · level 5 · glosses 3
- The glosses lack proper dictionary base forms (lemmas) with articles/infinitives, providing inflected chunks directly from the text instead (e.g., 'ausgefüllt hat', 'Fristen', 'wegzuwerfen'). This is poor practice for vocabulary acquisition at the B1-B2 level.

## 12. blog · A1-A2

> Мой сын пошёл в немецкий детский сад три месяца назад. Первую неделю он плакал каждое утро. Сейчас он рассказывает мне про друзей, поёт немецкие песни и поправляет моё произношение. Дети учат язык намного быстрее, чем взрослые.

**38-prompt-v1** (shown as A)

Mein Sohn geht seit drei Monaten in einen deutschen Kindergarten. In der ersten Woche hat er jeden Morgen geweint. Jetzt erzählt er mir von seinen Freunden. Er singt deutsche Lieder und korrigiert meine Aussprache. Kinder lernen eine Sprache viel schneller als Erwachsene.

meaning 5 · grammar 5 · level 5 · glosses 3
- Nouns in the glosses are missing their definite articles, which is highly discouraged when teaching German.
- Verbs and nouns in the glosses are presented in their inflected or plural forms instead of their base forms (infinitives / singular).

**38-prompt-v2** (shown as B)

Mein Sohn geht seit drei Monaten in einen deutschen Kindergarten. In der ersten Woche hat er jeden Morgen geweint. Jetzt erzählt er mir von seinen Freunden. Er singt deutsche Lieder und korrigiert meine Aussprache. Kinder lernen eine Sprache viel schneller als Erwachsene.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 13. blog · B1-B2

> Собеседование на немецком оказалось не таким страшным, как я себе представлял. Меня спросили о прошлом опыте, о том, почему я выбрал именно эту компанию, и как я справляюсь со стрессом. Сложнее всего было понимать быстрые вопросы с диалектом, поэтому я пару раз честно попросил повторить — и это никого не смутило.

**38-prompt-v1** (shown as A)

Das Vorstellungsgespräch auf Deutsch war gar nicht so schlimm, wie ich es mir vorgestellt hatte. Man fragte mich nach meinen bisherigen Erfahrungen, warum ich mich für genau dieses Unternehmen entschieden habe und wie ich mit Stress umgehe. Am schwierigsten war es, die schnellen Fragen mit Dialekt zu verstehen, deshalb habe ich ein paar Mal ehrlich darum gebeten, sie zu wiederholen – und das hat niemanden gestört.

meaning 5 · grammar 5 · level 5 · glosses 4
- no errors listed

**38-prompt-v2** (shown as B)

Das Vorstellungsgespräch auf Deutsch war gar nicht so schlimm, wie ich es mir vorgestellt hatte. Sie fragten mich nach meiner bisherigen Erfahrung, warum ich mich für genau dieses Unternehmen entschieden habe und wie ich mit Stress umgehe. Am schwierigsten war es, die schnellen Fragen mit Dialekt zu verstehen, deshalb habe ich ein paar Mal ehrlich darum gebeten, sie zu wiederholen – und das hat niemanden gestört.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 14. blog · A1-A2

> Летом мы впервые поехали на Балтийское море. Вода была холодная, но дети всё равно купались весь день. Вечером мы ели рыбные булочки в порту и смотрели на корабли. В следующем году хотим вернуться туда на целую неделю.

**38-prompt-v1** (shown as A)

Im Sommer sind wir zum ersten Mal an die Ostsee gefahren. Das Wasser war kalt, aber die Kinder haben trotzdem den ganzen Tag gebadet. Am Abend haben wir Fischbrötchen im Hafen gegessen und Schiffe beobachtet. Nächstes Jahr wollen wir für eine ganze Woche wieder dorthin fahren.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**38-prompt-v2** (shown as B)

Im Sommer sind wir zum ersten Mal an die Ostsee gefahren. Das Wasser war kalt, aber die Kinder haben trotzdem den ganzen Tag gebadet. Am Abend haben wir Fischbrötchen im Hafen gegessen und Schiffe beobachtet. Nächstes Jahr wollen wir für eine ganze Woche dorthin zurückfahren.

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 15. forum · A1-A2

> Привет всем! Подскажите, пожалуйста, где в Дюссельдорфе можно недорого купить подержанный велосипед? В магазинах цены очень высокие. Может быть, есть хорошие сайты или блошиные рынки? Заранее спасибо!

**38-prompt-v1** (shown as A)

Hallo zusammen! Wo kann man in Düsseldorf günstig ein gebrauchtes Fahrrad kaufen? In den Geschäften sind die Preise sehr hoch. Gibt es vielleicht gute Websites oder Flohmärkte? Vielen Dank im Voraus!

meaning 4 · grammar 5 · level 5 · glosses 3
- The translation omits 'Подскажите, пожалуйста' (e.g., 'Sagt mir bitte...' or 'Könnt ihr mir bitte sagen...').
- The glosses provide inflected and plural forms without definite articles (e.g., 'Geschäften', 'Preise', 'Flohmärkte'), which is bad practice for learning German nouns.

**38-prompt-v2** (shown as B)

Hallo zusammen! Wo kann man in Düsseldorf günstig ein gebrauchtes Fahrrad kaufen? In den Geschäften sind die Preise sehr hoch. Gibt es vielleicht gute Websites oder Flohmärkte? Vielen Dank im Voraus!

meaning 4 · grammar 5 · level 5 · glosses 4
- The translation omits 'Подскажите, пожалуйста'.
- The gloss for 'günstig' provides adjective translations ('недорогой, выгодный'), but it functions as an adverb in this context ('недорого').

## 16. forum · B1-B2

> Пришло письмо из налоговой с требованием подать декларацию за прошлый год, хотя я работаю по найму и думал, что мне это не нужно. Оказалось, что из-за смены работы посреди года и пособия по безработице декларация обязательна. Кто-нибудь пользовался программами вроде ELSTER без помощи консультанта? Насколько это сложно?

**38-prompt-v1** (shown as A)

Ich habe einen Brief vom Finanzamt bekommen, in dem ich aufgefordert werde, eine Steuererklärung für das letzte Jahr abzugeben. Eigentlich bin ich angestellt und dachte, dass ich das gar nicht machen muss. Es stellte sich jedoch heraus, dass die Erklärung wegen meines Jobwechsels mitten im Jahr und wegen des Arbeitslosengeldes Pflicht ist. Hat jemand schon mal Programme wie ELSTER ohne die Hilfe eines Beraters genutzt? Wie schwierig ist das eigentlich?

meaning 5 · grammar 5 · level 5 · glosses 4
- no errors listed

**38-prompt-v2** (shown as B)

Ich habe einen Brief vom Finanzamt bekommen, in dem ich aufgefordert werde, eine Steuererklärung für das letzte Jahr abzugeben. Eigentlich bin ich angestellt und dachte, dass ich das gar nicht machen muss. Es stellte sich jedoch heraus, dass die Erklärung wegen meines Jobwechsels mitten im Jahr und wegen des Arbeitslosengeldes Pflicht ist. Hat jemand schon mal Programme wie ELSTER ohne die Hilfe eines Steuerberaters genutzt? Wie schwierig ist das eigentlich?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 17. forum · A1-A2

> У нас в квартире уже неделю не работает отопление. Я написала хаусферверальтунгу два раза, но ответа нет. Что мне делать? Могу ли я платить меньше аренды, пока не починят?

**38-prompt-v1** (shown as A)

In unserer Wohnung funktioniert die Heizung seit einer Woche nicht mehr. Ich habe der Hausverwaltung schon zweimal geschrieben. Aber ich habe keine Antwort bekommen. Was soll ich jetzt tun? Kann ich weniger Miete zahlen, bis alles repariert ist?

meaning 5 · grammar 5 · level 5 · glosses 4
- no errors listed

**38-prompt-v2** (shown as B)

In unserer Wohnung funktioniert die Heizung seit einer Woche nicht. Ich habe der Hausverwaltung schon zweimal geschrieben, aber keine Antwort bekommen. Was soll ich tun? Kann ich weniger Miete zahlen, bis die Heizung repariert ist?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 18. forum · B1-B2

> Хочу сменить больничную кассу: моя повысила дополнительный взнос, а услуги остались прежними. Насколько я понимаю, при повышении взноса есть особое право на расторжение договора. Подскажите, нужно ли сначала найти новую кассу или можно сразу отправить заявление старой?

**38-prompt-v1** (shown as A)

Ich möchte meine Krankenkasse wechseln: Meine Kasse hat den Zusatzbeitrag erhöht, aber die Leistungen sind gleich geblieben. Soviel ich weiß, gibt es bei einer Beitragserhöhung ein Sonderkündigungsrecht. Könnt ihr mir sagen, ob ich zuerst eine neue Kasse finden muss oder ob ich gleich bei der alten kündigen kann?

meaning 5 · grammar 5 · level 5 · glosses 4
- The gloss for 'erhöht' is given as a conjugated verb instead of the infinitive 'erhöhen'.
- Nouns in the glosses lack their definite articles, which are crucial for German learners.

**38-prompt-v2** (shown as B)

Ich möchte meine Krankenkasse wechseln: Meine aktuelle hat den Zusatzbeitrag erhöht, aber die Leistungen sind gleich geblieben. Soweit ich weiß, hat man bei einer Erhöhung ein Sonderkündigungsrecht. Könnt ihr mir sagen, ob ich zuerst eine neue Kasse finden muss oder ob ich direkt bei der alten kündigen kann?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

## 19. forum · A1-A2

> Кто знает хорошие бесплатные курсы немецкого в Гамбурге? Я работаю днём, поэтому мне нужны вечерние занятия. Мой уровень сейчас примерно A2. Буду рада любым советам!

**38-prompt-v2** (shown as A)

Wer kennt gute kostenlose Deutschkurse in Hamburg? Ich arbeite am Tag. Deshalb brauche ich Unterricht am Abend. Mein Niveau ist jetzt ungefähr A2. Ich freue mich über jeden Tipp!

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed

**38-prompt-v1** (shown as B)

Wer kennt gute kostenlose Deutschkurse in Hamburg? Ich arbeite am Tag, deshalb brauche ich Unterricht am Abend. Mein Niveau ist jetzt ungefähr A2. Ich freue mich über jeden Tipp!

meaning 5 · grammar 5 · level 5 · glosses 4
- Glosses use inflected forms instead of basic lemmas ('kostenlose' instead of 'kostenlos')
- Nouns in glosses lack their definite articles ('Unterricht', 'Tipp')
- The phrase 'Ich freue mich über' is less standard as a dictionary unit compared to the infinitive 'sich freuen (über)'

## 20. forum · B1-B2

> Соседи сверху регулярно устраивают шумные вечеринки после десяти вечера, хотя в правилах дома прописан ночной покой. Разговор с ними ничего не дал. Стоит ли сразу писать управляющей компании или сначала вести протокол шума, чтобы потом были доказательства?

**38-prompt-v1** (shown as A)

Die Nachbarn über mir feiern regelmäßig laute Partys nach zweiundzwanzig Uhr, obwohl in der Hausordnung eine Nachtruhe festgelegt ist. Ein Gespräch mit ihnen hat leider nichts gebracht. Lohnt es sich, direkt an die Hausverwaltung zu schreiben, oder sollte ich zuerst ein Lärmprotokoll führen, um später Beweise zu haben?

meaning 4 · grammar 4 · level 5 · glosses 5
- Added 'leider' which is not in the source text.
- 'eine Nachtruhe' is grammatically correct but 'die Nachtruhe' is the more natural and standard collocation in this context.

**38-prompt-v2** (shown as B)

Die Nachbarn von oben veranstalten regelmäßig laute Partys nach 22 Uhr, obwohl in der Hausordnung die Nachtruhe festgelegt ist. Ein Gespräch mit ihnen hat nichts gebracht. Lohnt es sich, sofort der Hausverwaltung zu schreiben, oder sollte man zuerst ein Lärmprotokoll führen, um später Beweise zu haben?

meaning 5 · grammar 5 · level 5 · glosses 5
- no errors listed
