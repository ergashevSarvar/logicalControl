create temp table classifier_table_seed (
    table_id uuid not null,
    table_name text not null,
    entity_name_definition text not null,
    description text not null,
    system_type varchar(120) not null
) on commit drop;

insert into classifier_table_seed (
    table_id,
    table_name,
    entity_name_definition,
    description,
    system_type
) values
    ('00000000-0000-0000-0000-000000001001', 'AUTODECL', 'Asosiy AT deklaratsiyasi', 'Yukli avtotransport (AT) tizimida chegara orqali o''tayotgan transport uchun ochiladigan asosiy deklaratsiya kartasi.', 'Yukli avtotransport (AT)'),
    ('00000000-0000-0000-0000-000000001002', 'AUTODECLD', 'AT deklaratsiya tafsilotlari', 'AUTODECL yozuviga bog''langan batafsil logistika, hisob-faktura va qabul ombori ma''lumotlarini saqlaydi.', 'Yukli avtotransport (AT)'),
    ('00000000-0000-0000-0000-000000001003', 'COMMODITY', 'AT tovar pozitsiyalari', 'Yukli avtotransport deklaratsiyasidagi tovar satrlari, TN VED kodi, og''irlik va qiymat ma''lumotlarini yuritadi.', 'Yukli avtotransport (AT)'),
    ('00000000-0000-0000-0000-000000001004', 'CDOCUMENTS', 'AT hujjatlari', 'AT deklaratsiyasi va partiyaga biriktirilgan ruxsatnoma, sertifikat va boshqa hamroh hujjatlarni saqlaydi.', 'Yukli avtotransport (AT)'),
    ('00000000-0000-0000-0000-000000001101', 'AUTODECLMOBILE', 'Mobil deklaratsiya', 'Yuksiz yoki yengil transport (MB) bo''yicha mobil kanal orqali yuborilgan deklaratsiyalarning asosiy jadvali.', 'Yuksiz yoki yengil transport (MB)'),
    ('00000000-0000-0000-0000-000000001102', 'BOOK11', 'Book11 nazorat ro''yxati', 'MB yo''nalishida nazorat uchun shakllantirilgan qisqa deklaratsiya va transport identifikatsiya ma''lumotlarini saqlaydi.', 'Yuksiz yoki yengil transport (MB)'),
    ('00000000-0000-0000-0000-000000001103', 'BORDER_IMEX', 'Chegara IMEX nazorati', 'Chegara postida mobil transport bo''yicha IMEX tekshiruv natijalari va xizmat xodimlari belgilovlarini saqlaydi.', 'Yuksiz yoki yengil transport (MB)'),
    ('00000000-0000-0000-0000-000000001201', 'RAILWAYDECL', 'Temir yo''l deklaratsiyasi', 'Temir yo''l (RW) tizimidagi vagon yoki tarkib bo''yicha asosiy tranzit deklaratsiyasi.', 'Temir yo''l (RW)'),
    ('00000000-0000-0000-0000-000000001202', 'DECISION_NOACCESS_RW', 'RW kirishni cheklash qarori', 'Temir yo''l deklaratsiyasi bo''yicha kirishni cheklash yoki alohida ko''rik qarorlarini qayd etadi.', 'Temir yo''l (RW)'),
    ('00000000-0000-0000-0000-000000001203', 'COMMODITY_RW', 'RW tovar pozitsiyalari', 'Temir yo''l deklaratsiyasidagi yuk nomenklaturasi, og''irlik va qadoq birliklarini saqlaydi.', 'Temir yo''l (RW)'),
    ('00000000-0000-0000-0000-000000001301', 'AUTODECL_EK', 'Eksport deklaratsiyasi', 'Eksport uch qadam (EK) jarayonidagi asosiy deklaratsiya va uning holatlarini saqlaydi.', 'Eksport uch qadam (EK)'),
    ('00000000-0000-0000-0000-000000001302', 'CARRIER_EK', 'Eksport tashuvchisi', 'Eksport deklaratsiyasiga biriktirilgan tashuvchi yoki vakil haqidagi ma''lumotlarni saqlaydi.', 'Eksport uch qadam (EK)'),
    ('00000000-0000-0000-0000-000000001303', 'COMMODITY_EK', 'Eksport tovar pozitsiyalari', 'Eksport deklaratsiyasidagi tovarlar kodi, og''irligi, qiymati va to''lov usuli ma''lumotlarini yuritadi.', 'Eksport uch qadam (EK)'),
    ('00000000-0000-0000-0000-000000001304', 'CDOCUMENTS_EK', 'Eksport hujjatlari', 'Eksport deklaratsiyasi uchun taqdim etilgan hujjatlar ro''yxati va rekvizitlarini saqlaydi.', 'Eksport uch qadam (EK)'),
    ('00000000-0000-0000-0000-000000001401', 'COMMERCEDECL', 'Kommersiya deklaratsiyasi', 'Kommersiya (EC) yo''nalishida jismoniy shaxs jo''natmalari bo''yicha asosiy deklaratsiya jadvali.', 'Kommersiya (EC)'),
    ('00000000-0000-0000-0000-000000001402', 'COMMODITY_CM', 'Kommersiya tovar pozitsiyalari', 'Kommersiya deklaratsiyasidagi mahsulot satrlari, IMEI va kurs qiymatlarini saqlaydi.', 'Kommersiya (EC)'),
    ('00000000-0000-0000-0000-000000001403', 'CDOCUMENTS_CM', 'Kommersiya hujjatlari', 'Kommersiya deklaratsiyasiga biriktirilgan asoslovchi hujjatlar va ularning og''irlik bo''yicha tafsilotlarini saqlaydi.', 'Kommersiya (EC)'),
    ('00000000-0000-0000-0000-000000001404', 'CMREDIT', 'Kommersiya bog''lovchi kartasi', 'Kommersiya deklaratsiyasi, transport, tovar va taraflar o''rtasidagi bog''lanishni bir joyga jamlaydi.', 'Kommersiya (EC)');

update classifier_tables t
set entity_name_definition = s.entity_name_definition,
    description = s.description,
    system_type = s.system_type,
    updated_at = now()
from classifier_table_seed s
where lower(t.table_name) = lower(s.table_name);

insert into classifier_tables (
    id,
    table_name,
    entity_name_definition,
    description,
    system_type
)
select
    s.table_id,
    s.table_name,
    s.entity_name_definition,
    s.description,
    s.system_type
from classifier_table_seed s
where not exists (
    select 1
    from classifier_tables t
    where lower(t.table_name) = lower(s.table_name)
);

create temp table classifier_column_seed (
    column_id uuid not null,
    table_name text not null,
    column_name text not null,
    column_name_definition text not null,
    column_type text,
    column_length text,
    data_type text not null,
    column_description text,
    nullable boolean,
    ordinal_position integer not null
) on commit drop;

insert into classifier_column_seed (
    column_id,
    table_name,
    column_name,
    column_name_definition,
    column_type,
    column_length,
    data_type,
    column_description,
    nullable,
    ordinal_position
) values
    ('00000000-0000-0000-0000-000000200101', 'AUTODECL', 'ID', 'Deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Asosiy deklaratsiya yozuvining noyob identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000200102', 'AUTODECL', 'UNCOD_ID', 'Unikal nazorat kodi', 'varchar', '20', 'varchar(20)', 'Deklaratsiyani tizimlararo qidirish uchun ishlatiladigan yagona raqam.', true, 2),
    ('00000000-0000-0000-0000-000000200103', 'AUTODECL', 'G29', 'Bojxona posti kodi', 'varchar', '5', 'varchar(5)', 'Deklaratsiya rasmiylashtirilayotgan yoki kirib kelgan bojxona posti kodi.', true, 3),
    ('00000000-0000-0000-0000-000000200104', 'AUTODECL', 'T_TYPE', 'Transport turi', 'varchar', '2', 'varchar(2)', 'Transport vositasi turi yoki toifasi kodi.', true, 4),
    ('00000000-0000-0000-0000-000000200105', 'AUTODECL', 'COUNTRY_START', 'Jo''nash davlati', 'varchar', '3', 'varchar(3)', 'Yuk yoki transport jo''nagan davlatning kodi.', true, 5),
    ('00000000-0000-0000-0000-000000200106', 'AUTODECL', 'COUNTRY_END', 'Borish davlati', 'varchar', '3', 'varchar(3)', 'Transport yo''nalishining yakuniy manzil davlati kodi.', true, 6),
    ('00000000-0000-0000-0000-000000200107', 'AUTODECL', 'STATE', 'Holat kodi', 'smallint', null, 'smallint', 'Deklaratsiyaning amaldagi biznes holati kodi.', true, 7),
    ('00000000-0000-0000-0000-000000200108', 'AUTODECL', 'CHANNEL_WAY', 'Yo''lak turi', 'smallint', null, 'smallint', 'Risk boshqaruvi bo''yicha tanlangan nazorat yo''lagi.', true, 8),
    ('00000000-0000-0000-0000-000000200109', 'AUTODECL', 'CHECKINTIME', 'Kirish vaqti', 'timestamp', null, 'timestamp', 'Transport yoki deklaratsiya nazorat hududiga kirgan vaqt.', true, 9),
    ('00000000-0000-0000-0000-000000200110', 'AUTODECL', 'CHECKOUTTIME', 'Chiqish vaqti', 'timestamp', null, 'timestamp', 'Transport yoki deklaratsiya nazorat hududidan chiqqan vaqt.', true, 10),

    ('00000000-0000-0000-0000-000000200201', 'AUTODECLD', 'ID', 'Tafsilot ID', 'varchar', '50', 'varchar(50)', 'AUTODECLD yozuvining noyob identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000200202', 'AUTODECLD', 'AUTODECL_ID', 'Asosiy deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Qaysi AUTODECL yozuviga tegishli ekanini ko''rsatadi.', true, 2),
    ('00000000-0000-0000-0000-000000200203', 'AUTODECLD', 'G21NO', 'Avto raqami', 'varchar', '150', 'varchar(150)', 'Transport vositasining davlat raqami yoki belgilanishi.', true, 3),
    ('00000000-0000-0000-0000-000000200204', 'AUTODECLD', 'G15', 'Jo''natuvchi davlat', 'varchar', '3', 'varchar(3)', 'Yuk jo''natilgan davlat kodi.', true, 4),
    ('00000000-0000-0000-0000-000000200205', 'AUTODECLD', 'G17', 'Qabul qiluvchi davlat', 'varchar', '20', 'varchar(20)', 'Yuk yetib boradigan davlat yoki yo''nalish kodi.', true, 5),
    ('00000000-0000-0000-0000-000000200206', 'AUTODECLD', 'INVOICE_NUMBER', 'Hisob-faktura raqami', 'varchar', '150', 'varchar(150)', 'Tovar bo''yicha invoice hujjati raqami.', true, 6),
    ('00000000-0000-0000-0000-000000200207', 'AUTODECLD', 'PART_COUNT', 'Partiyalar soni', 'integer', null, 'integer', 'Mazkur deklaratsiyadagi partiyalar yoki bo''limlar soni.', true, 7),
    ('00000000-0000-0000-0000-000000200208', 'AUTODECLD', 'ARRIVAL_WAREHOUSE', 'Kelish ombori', 'varchar', '1800', 'varchar(1800)', 'Yuk qabul qilinadigan ombor yoki vaqtincha saqlash joyi nomi.', true, 8),

    ('00000000-0000-0000-0000-000000200301', 'COMMODITY', 'ID', 'Tovar satri ID', 'varchar', '50', 'varchar(50)', 'AT tovar satrining noyob identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000200302', 'COMMODITY', 'AUTODECL_ID', 'Deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Tovar qaysi deklaratsiyaga tegishli ekanini ko''rsatadi.', true, 2),
    ('00000000-0000-0000-0000-000000200303', 'COMMODITY', 'G33', 'TN VED kodi', 'varchar', '10', 'varchar(10)', 'Tovarning bojxona tasnif kodi.', true, 3),
    ('00000000-0000-0000-0000-000000200304', 'COMMODITY', 'G31NAME', 'Tovar nomi', 'varchar', '1500', 'varchar(1500)', 'Tovar yoki mahsulotning to''liq tavsifi.', true, 4),
    ('00000000-0000-0000-0000-000000200305', 'COMMODITY', 'G35', 'Brutto og''irlik', 'decimal', '18,3', 'decimal(18,3)', 'Tovarning umumiy brutto og''irligi.', false, 5),
    ('00000000-0000-0000-0000-000000200306', 'COMMODITY', 'G36', 'Netto og''irlik', 'decimal', '18,3', 'decimal(18,3)', 'Tovarning netto og''irligi.', false, 6),
    ('00000000-0000-0000-0000-000000200307', 'COMMODITY', 'G42', 'Faktura qiymati', 'decimal', '23,3', 'decimal(23,3)', 'Invoice bo''yicha tovar qiymati.', false, 7),
    ('00000000-0000-0000-0000-000000200308', 'COMMODITY', 'PACKAGING', 'Qadoq kodi', 'varchar', '3', 'varchar(3)', 'Qadoqlash turi kodi.', true, 8),

    ('00000000-0000-0000-0000-000000200401', 'CDOCUMENTS', 'ID', 'Hujjat ID', 'varchar', '50', 'varchar(50)', 'AT hujjat yozuvining noyob identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000200402', 'CDOCUMENTS', 'AUTODECL_ID', 'Deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Hujjat qaysi deklaratsiyaga tegishli ekanini ko''rsatadi.', true, 2),
    ('00000000-0000-0000-0000-000000200403', 'CDOCUMENTS', 'DOCCODE', 'Hujjat kodi', 'varchar', '20', 'varchar(20)', 'Hujjat turining tasnif kodi.', true, 3),
    ('00000000-0000-0000-0000-000000200404', 'CDOCUMENTS', 'DOCCODE_NAME', 'Hujjat turi nomi', 'varchar', '1800', 'varchar(1800)', 'Hujjat kodi uchun tushuntiruvchi nom.', true, 4),
    ('00000000-0000-0000-0000-000000200405', 'CDOCUMENTS', 'DOCNO', 'Hujjat raqami', 'varchar', '150', 'varchar(150)', 'Asoslovchi hujjatning raqami.', true, 5),
    ('00000000-0000-0000-0000-000000200406', 'CDOCUMENTS', 'DCODATE', 'Hujjat sanasi', 'date', null, 'date', 'Hujjat rasmiylashtirilgan sana.', false, 6),

    ('00000000-0000-0000-0000-000000210101', 'AUTODECLMOBILE', 'ID', 'Mobil deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'MB deklaratsiyasining noyob identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000210102', 'AUTODECLMOBILE', 'UNCOD_ID', 'Unikal nazorat kodi', 'varchar', '20', 'varchar(20)', 'Mobil deklaratsiyani boshqa modullar bilan bog''lash uchun ishlatiladi.', true, 2),
    ('00000000-0000-0000-0000-000000210103', 'AUTODECLMOBILE', 'G29', 'Bojxona posti kodi', 'varchar', '5', 'varchar(5)', 'Mobil deklaratsiya tegishli post kodi.', true, 3),
    ('00000000-0000-0000-0000-000000210104', 'AUTODECLMOBILE', 'T_TYPE', 'Transport turi', 'varchar', '2', 'varchar(2)', 'Yengil yoki yuksiz transport kategoriyasi.', true, 4),
    ('00000000-0000-0000-0000-000000210105', 'AUTODECLMOBILE', 'G21NO', 'Transport raqami', 'varchar', '150', 'varchar(150)', 'Asosiy transport vositasi raqami.', true, 5),
    ('00000000-0000-0000-0000-000000210106', 'AUTODECLMOBILE', 'T_VIN', 'VIN raqami', 'varchar', '100', 'varchar(100)', 'Transport vositasining VIN identifikatori.', true, 6),
    ('00000000-0000-0000-0000-000000210107', 'AUTODECLMOBILE', 'COUNTRY_START', 'Jo''nash davlati', 'varchar', '3', 'varchar(3)', 'Transport safarining boshlanish davlati kodi.', true, 7),
    ('00000000-0000-0000-0000-000000210108', 'AUTODECLMOBILE', 'COUNTRY_END', 'Borish davlati', 'varchar', '3', 'varchar(3)', 'Transport safarining yakuniy davlat kodi.', true, 8),
    ('00000000-0000-0000-0000-000000210109', 'AUTODECLMOBILE', 'STATE', 'Holat kodi', 'smallint', null, 'smallint', 'Mobil deklaratsiyaning amaldagi holati.', true, 9),
    ('00000000-0000-0000-0000-000000210110', 'AUTODECLMOBILE', 'DIRECTION', 'Harakat yo''nalishi', 'smallint', null, 'smallint', 'Kirish yoki chiqish yo''nalishini bildiradi.', true, 10),

    ('00000000-0000-0000-0000-000000210201', 'BOOK11', 'ID', 'Book11 ID', 'varchar', '50', 'varchar(50)', 'Book11 yozuvining noyob identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000210202', 'BOOK11', 'AUTODECL_ID', 'Deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Book11 yozuvi bog''langan AT deklaratsiyasi.', true, 2),
    ('00000000-0000-0000-0000-000000210203', 'BOOK11', 'UNCOD_ID', 'Unikal nazorat kodi', 'varchar', '20', 'varchar(20)', 'Book11 yozuvi bo''yicha qidiruv va bog''lash kodi.', true, 3),
    ('00000000-0000-0000-0000-000000210204', 'BOOK11', 'G29', 'Bojxona posti kodi', 'varchar', '5', 'varchar(5)', 'Mazkur Book11 yozuvi tegishli post kodi.', true, 4),
    ('00000000-0000-0000-0000-000000210205', 'BOOK11', 'T_TYPE', 'Transport turi', 'varchar', '2', 'varchar(2)', 'Transport vositasi turi kodi.', true, 5),
    ('00000000-0000-0000-0000-000000210206', 'BOOK11', 'T_VIN', 'VIN raqami', 'varchar', '100', 'varchar(100)', 'Transport vositasining VIN kodi.', true, 6),
    ('00000000-0000-0000-0000-000000210207', 'BOOK11', 'T_WEIGHT', 'Transport og''irligi', 'decimal', '13,3', 'decimal(13,3)', 'Transport vositasining qayd etilgan vazni.', false, 7),
    ('00000000-0000-0000-0000-000000210208', 'BOOK11', 'STATE', 'Holat kodi', 'smallint', null, 'smallint', 'Book11 yozuvining joriy holati.', true, 8),

    ('00000000-0000-0000-0000-000000210301', 'BORDER_IMEX', 'ID', 'Tekshiruv ID', 'varchar', '50', 'varchar(50)', 'Chegara IMEX tekshiruv yozuvining identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000210302', 'BORDER_IMEX', 'LOCATION', 'Hudud kodi', 'varchar', '5', 'varchar(5)', 'Tekshiruv o''tkazilgan joy yoki hudud kodi.', true, 2),
    ('00000000-0000-0000-0000-000000210303', 'BORDER_IMEX', 'POST', 'Post kodi', 'varchar', '5', 'varchar(5)', 'Chegara posti kodi.', true, 3),
    ('00000000-0000-0000-0000-000000210304', 'BORDER_IMEX', 'DIRECTION', 'Harakat yo''nalishi', 'smallint', null, 'smallint', 'Kirish yoki chiqish yo''nalishini bildiradi.', true, 4),
    ('00000000-0000-0000-0000-000000210305', 'BORDER_IMEX', 'CHECKINTIME', 'Tekshiruv vaqti', 'timestamp', null, 'timestamp', 'Chegaradagi nazorat boshlagan vaqt.', true, 5),
    ('00000000-0000-0000-0000-000000210306', 'BORDER_IMEX', 'G21NO', 'Avto raqami', 'varchar', '150', 'varchar(150)', 'Chegaradan o''tayotgan transport vositasi raqami.', true, 6),
    ('00000000-0000-0000-0000-000000210307', 'BORDER_IMEX', 'T_TYPE', 'Transport turi', 'varchar', '2', 'varchar(2)', 'Transport vositasi kategoriyasi.', true, 7),
    ('00000000-0000-0000-0000-000000210308', 'BORDER_IMEX', 'UNCOD_ID', 'Bog''lovchi kod', 'varchar', '600', 'varchar(600)', 'Tegishli deklaratsiya yoki mobil yozuv bilan bog''lash uchun ishlatiladigan identifikator.', true, 8),

    ('00000000-0000-0000-0000-000000220101', 'RAILWAYDECL', 'ID', 'RW deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Temir yo''l deklaratsiyasining noyob identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000220102', 'RAILWAYDECL', 'UNCOD_ID', 'Unikal nazorat kodi', 'varchar', '20', 'varchar(20)', 'Temir yo''l deklaratsiyasini yagona tartibda qidirish kodi.', true, 2),
    ('00000000-0000-0000-0000-000000220103', 'RAILWAYDECL', 'G29', 'Bojxona posti kodi', 'varchar', '5', 'varchar(5)', 'Temir yo''l yukiga xizmat ko''rsatayotgan post kodi.', true, 3),
    ('00000000-0000-0000-0000-000000220104', 'RAILWAYDECL', 'CHECKINTIME', 'Kirish vaqti', 'timestamp', null, 'timestamp', 'Tarkib bojxona nazorati hududiga kirgan vaqt.', true, 4),
    ('00000000-0000-0000-0000-000000220105', 'RAILWAYDECL', 'RW_CARRIAGE_NO', 'Tashish raqami', 'varchar', '150', 'varchar(150)', 'Temir yo''l tashish hujjati yoki vagonlar ketma-ketlik raqami.', true, 5),
    ('00000000-0000-0000-0000-000000220106', 'RAILWAYDECL', 'RW_START_STATION_NM', 'Jo''nash stansiyasi', 'varchar', '1200', 'varchar(1200)', 'Yuk jo''natilgan stansiya nomi.', true, 6),
    ('00000000-0000-0000-0000-000000220107', 'RAILWAYDECL', 'RW_END_SENDING_NM', 'Borish stansiyasi', 'varchar', '1200', 'varchar(1200)', 'Yuk yetib boradigan stansiya nomi.', true, 7),
    ('00000000-0000-0000-0000-000000220108', 'RAILWAYDECL', 'STATE', 'Holat kodi', 'smallint', null, 'smallint', 'Temir yo''l deklaratsiyasining joriy holati.', true, 8),

    ('00000000-0000-0000-0000-000000220201', 'DECISION_NOACCESS_RW', 'ID', 'Qaror ID', 'varchar', '50', 'varchar(50)', 'Noaccess qaror yozuvining identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000220202', 'DECISION_NOACCESS_RW', 'RAILWAYDECL_ID', 'RW deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Qaror qaysi temir yo''l deklaratsiyasiga tegishli ekanini ko''rsatadi.', true, 2),
    ('00000000-0000-0000-0000-000000220203', 'DECISION_NOACCESS_RW', 'ARIZA_NUMBER', 'Ariza raqami', 'varchar', '30', 'varchar(30)', 'Qaror uchun asos bo''lgan ariza hujjati raqami.', true, 3),
    ('00000000-0000-0000-0000-000000220204', 'DECISION_NOACCESS_RW', 'ARIZA_DATE', 'Ariza sanasi', 'date', null, 'date', 'Qaror asosidagi ariza rasmiy sanasi.', true, 4),
    ('00000000-0000-0000-0000-000000220205', 'DECISION_NOACCESS_RW', 'DECISION', 'Qaror kodi', 'smallint', null, 'smallint', 'Qaror turi yoki natija kodi.', true, 5),
    ('00000000-0000-0000-0000-000000220206', 'DECISION_NOACCESS_RW', 'DECISION_NAME', 'Qaror nomi', 'varchar', '100', 'varchar(100)', 'Qarorning matnli talqini.', true, 6),
    ('00000000-0000-0000-0000-000000220207', 'DECISION_NOACCESS_RW', 'STATION_NAME', 'Stansiya nomi', 'varchar', '1200', 'varchar(1200)', 'Qaror qo''llangan stansiya nomi.', true, 7),
    ('00000000-0000-0000-0000-000000220208', 'DECISION_NOACCESS_RW', 'WAG_NO', 'Vagon raqami', 'varchar', '15', 'varchar(15)', 'Qaror tegishli bo''lgan vagon raqami.', true, 8),
    ('00000000-0000-0000-0000-000000220209', 'DECISION_NOACCESS_RW', 'SEPARATE_CAUSE', 'Alohida sabab', 'varchar', '3000', 'varchar(3000)', 'Kirishni cheklash yoki alohida ko''rik sababi.', true, 9),

    ('00000000-0000-0000-0000-000000220301', 'COMMODITY_RW', 'ID', 'RW tovar ID', 'varchar', '50', 'varchar(50)', 'Temir yo''l tovar satrining identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000220302', 'COMMODITY_RW', 'RAILWAYDECL_ID', 'RW deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Tovar satri qaysi temir yo''l deklaratsiyasiga tegishli ekanini ko''rsatadi.', true, 2),
    ('00000000-0000-0000-0000-000000220303', 'COMMODITY_RW', 'G33', 'TN VED kodi', 'varchar', '10', 'varchar(10)', 'Temir yo''l orqali olib o''tilayotgan tovar kodi.', true, 3),
    ('00000000-0000-0000-0000-000000220304', 'COMMODITY_RW', 'G31NAME', 'Tovar nomi', 'varchar', '1500', 'varchar(1500)', 'Yuk tarkibidagi tovarning matnli tavsifi.', true, 4),
    ('00000000-0000-0000-0000-000000220305', 'COMMODITY_RW', 'G35', 'Brutto og''irlik', 'decimal', '18,3', 'decimal(18,3)', 'Yukning brutto og''irligi.', false, 5),
    ('00000000-0000-0000-0000-000000220306', 'COMMODITY_RW', 'G36', 'Netto og''irlik', 'decimal', '18,3', 'decimal(18,3)', 'Yukning netto og''irligi.', false, 6),
    ('00000000-0000-0000-0000-000000220307', 'COMMODITY_RW', 'G42', 'Faktura qiymati', 'decimal', '23,3', 'decimal(23,3)', 'Tovarning deklaratsiyadagi qiymati.', false, 7),
    ('00000000-0000-0000-0000-000000220308', 'COMMODITY_RW', 'PACKAGING', 'Qadoq kodi', 'varchar', '3', 'varchar(3)', 'Yuk qadoqlash turi kodi.', true, 8),

    ('00000000-0000-0000-0000-000000230101', 'AUTODECL_EK', 'ID', 'Eksport deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'EK deklaratsiyasining noyob identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000230102', 'AUTODECL_EK', 'UNCOD_ID', 'Unikal nazorat kodi', 'varchar', '20', 'varchar(20)', 'Eksport deklaratsiyasini tizimlar kesimida bog''lash kodi.', true, 2),
    ('00000000-0000-0000-0000-000000230103', 'AUTODECL_EK', 'G29', 'Chiqish posti kodi', 'varchar', '5', 'varchar(5)', 'Eksport rasmiylashtirilayotgan post kodi.', true, 3),
    ('00000000-0000-0000-0000-000000230104', 'AUTODECL_EK', 'G29T', 'Tranzit yoki chiqish posti', 'varchar', '5', 'varchar(5)', 'Eksport jarayonidagi qo''shimcha post kodi.', true, 4),
    ('00000000-0000-0000-0000-000000230105', 'AUTODECL_EK', 'SHIPPER_ID', 'Jo''natuvchi ID', 'varchar', '50', 'varchar(50)', 'Eksport qiluvchi yoki jo''natuvchi subyekt identifikatori.', true, 5),
    ('00000000-0000-0000-0000-000000230106', 'AUTODECL_EK', 'RECEIVER_ID', 'Qabul qiluvchi ID', 'varchar', '50', 'varchar(50)', 'Eksport bo''yicha xorijiy qabul qiluvchi identifikatori.', true, 6),
    ('00000000-0000-0000-0000-000000230107', 'AUTODECL_EK', 'STATE', 'Holat kodi', 'smallint', null, 'smallint', 'Eksport deklaratsiyasining joriy holati.', true, 7),
    ('00000000-0000-0000-0000-000000230108', 'AUTODECL_EK', 'SEND_DATE', 'Yuborish sanasi', 'date', null, 'date', 'Eksport hujjati yuborilgan sana.', true, 8),
    ('00000000-0000-0000-0000-000000230109', 'AUTODECL_EK', 'DELIVERY_DATE', 'Yetkazish sanasi', 'date', null, 'date', 'Tovar yetkazilishi rejalashtirilgan yoki qayd etilgan sana.', true, 9),
    ('00000000-0000-0000-0000-000000230110', 'AUTODECL_EK', 'CHECKINTIME', 'Kirish vaqti', 'timestamp', null, 'timestamp', 'Eksport deklaratsiyasi nazorat tizimiga kirgan vaqt.', true, 10),

    ('00000000-0000-0000-0000-000000230201', 'CARRIER_EK', 'ID', 'Tashuvchi ID', 'varchar', '50', 'varchar(50)', 'Eksport tashuvchisi yozuvining identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000230202', 'CARRIER_EK', 'AUTODECLEK_ID', 'Eksport deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Tashuvchi qaysi eksport deklaratsiyasiga tegishli ekanini ko''rsatadi.', true, 2),
    ('00000000-0000-0000-0000-000000230203', 'CARRIER_EK', 'C_NAME', 'Tashuvchi nomi', 'varchar', '300', 'varchar(300)', 'Tashuvchi kompaniya yoki shaxs nomi.', true, 3),
    ('00000000-0000-0000-0000-000000230204', 'CARRIER_EK', 'C_COUNTRY', 'Tashuvchi davlati', 'varchar', '3', 'varchar(3)', 'Tashuvchining davlat kodi.', true, 4),
    ('00000000-0000-0000-0000-000000230205', 'CARRIER_EK', 'C_PHONE', 'Telefon', 'varchar', '50', 'varchar(50)', 'Tashuvchi bilan bog''lanish telefoni.', true, 5),
    ('00000000-0000-0000-0000-000000230206', 'CARRIER_EK', 'PERSON_TYPE', 'Shaxs turi', 'varchar', '3', 'varchar(3)', 'Tashuvchi yuridik yoki jismoniy shaxs ekanini bildiradi.', false, 6),
    ('00000000-0000-0000-0000-000000230207', 'CARRIER_EK', 'RE_COUNTRY_NAME', 'Ro''yxatga olingan davlat', 'varchar', '255', 'varchar(255)', 'Tashuvchining ro''yxatdan o''tgan davlati nomi.', true, 7),

    ('00000000-0000-0000-0000-000000230301', 'COMMODITY_EK', 'ID', 'Eksport tovar ID', 'varchar', '50', 'varchar(50)', 'Eksport tovar satrining identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000230302', 'COMMODITY_EK', 'AUTODECLEK_ID', 'Eksport deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Tovar satri qaysi eksport deklaratsiyasiga tegishli ekanini ko''rsatadi.', true, 2),
    ('00000000-0000-0000-0000-000000230303', 'COMMODITY_EK', 'G33', 'TN VED kodi', 'varchar', '10', 'varchar(10)', 'Eksport qilinayotgan tovarning kodi.', true, 3),
    ('00000000-0000-0000-0000-000000230304', 'COMMODITY_EK', 'G31NAME', 'Tovar nomi', 'varchar', '1500', 'varchar(1500)', 'Eksport tovarining to''liq tavsifi.', true, 4),
    ('00000000-0000-0000-0000-000000230305', 'COMMODITY_EK', 'G35', 'Brutto og''irlik', 'decimal', '18,3', 'decimal(18,3)', 'Eksport tovarining brutto og''irligi.', false, 5),
    ('00000000-0000-0000-0000-000000230306', 'COMMODITY_EK', 'G36', 'Netto og''irlik', 'decimal', '18,3', 'decimal(18,3)', 'Eksport tovarining netto og''irligi.', false, 6),
    ('00000000-0000-0000-0000-000000230307', 'COMMODITY_EK', 'G42', 'Faktura qiymati', 'decimal', '26,3', 'decimal(26,3)', 'Eksport bo''yicha faktura qiymati.', false, 7),
    ('00000000-0000-0000-0000-000000230308', 'COMMODITY_EK', 'G45', 'Bojxona qiymati', 'decimal', '18,3', 'decimal(18,3)', 'Bojxona uchun hisoblangan qiymat.', false, 8),
    ('00000000-0000-0000-0000-000000230309', 'COMMODITY_EK', 'PAYMENT_METHOD', 'To''lov usuli', 'varchar', '3', 'varchar(3)', 'Tovar bo''yicha to''lov shakli kodi.', true, 9),

    ('00000000-0000-0000-0000-000000230401', 'CDOCUMENTS_EK', 'ID', 'Eksport hujjat ID', 'varchar', '50', 'varchar(50)', 'Eksport hujjat yozuvining identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000230402', 'CDOCUMENTS_EK', 'AUTODECLEK_ID', 'Eksport deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Hujjat qaysi eksport deklaratsiyasiga tegishli ekanini ko''rsatadi.', true, 2),
    ('00000000-0000-0000-0000-000000230403', 'CDOCUMENTS_EK', 'DOCCODE', 'Hujjat kodi', 'varchar', '20', 'varchar(20)', 'Eksport hujjati turi kodi.', true, 3),
    ('00000000-0000-0000-0000-000000230404', 'CDOCUMENTS_EK', 'DOCCODE_NAME', 'Hujjat nomi', 'varchar', '1800', 'varchar(1800)', 'Hujjat turi nomi yoki izohi.', true, 4),
    ('00000000-0000-0000-0000-000000230405', 'CDOCUMENTS_EK', 'DOCNO', 'Hujjat raqami', 'varchar', '150', 'varchar(150)', 'Taqdim etilgan hujjat raqami.', true, 5),
    ('00000000-0000-0000-0000-000000230406', 'CDOCUMENTS_EK', 'DCODATE', 'Hujjat sanasi', 'date', null, 'date', 'Eksport hujjatining sanasi.', false, 6),

    ('00000000-0000-0000-0000-000000240101', 'COMMERCEDECL', 'ID', 'Kommersiya deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Kommersiya deklaratsiyasining identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000240102', 'COMMERCEDECL', 'UNCOD_ID', 'Unikal nazorat kodi', 'varchar', '20', 'varchar(20)', 'Kommersiya deklaratsiyasini qidirish va kuzatish kodi.', true, 2),
    ('00000000-0000-0000-0000-000000240103', 'COMMERCEDECL', 'G29', 'Bojxona posti kodi', 'varchar', '255', 'varchar(255)', 'Kommersiya deklaratsiyasi biriktirilgan post kodi.', true, 3),
    ('00000000-0000-0000-0000-000000240104', 'COMMERCEDECL', 'G15', 'Jo''nash davlati', 'varchar', '3', 'varchar(3)', 'Jo''natma yuborilgan davlat kodi.', true, 4),
    ('00000000-0000-0000-0000-000000240105', 'COMMERCEDECL', 'G17', 'Qabul qiluvchi davlati', 'varchar', '3', 'varchar(3)', 'Jo''natma yetib boradigan davlat kodi.', true, 5),
    ('00000000-0000-0000-0000-000000240106', 'COMMERCEDECL', 'G2NAME', 'Jo''natuvchi nomi', 'varchar', '300', 'varchar(300)', 'Jo''natuvchi shaxs yoki tashkilot nomi.', true, 6),
    ('00000000-0000-0000-0000-000000240107', 'COMMERCEDECL', 'G8NAME', 'Qabul qiluvchi nomi', 'varchar', '300', 'varchar(300)', 'Qabul qiluvchi shaxs nomi.', true, 7),
    ('00000000-0000-0000-0000-000000240108', 'COMMERCEDECL', 'STATE', 'Holat kodi', 'smallint', null, 'smallint', 'Kommersiya deklaratsiyasining amaldagi holati.', true, 8),
    ('00000000-0000-0000-0000-000000240109', 'COMMERCEDECL', 'DOC_TYPE', 'Deklaratsiya turi', 'varchar', '255', 'varchar(255)', 'Kommersiya deklaratsiyasi yoki jo''natma turi.', true, 9),
    ('00000000-0000-0000-0000-000000240110', 'COMMERCEDECL', 'CHECKINTIME', 'Qabul vaqti', 'timestamp', null, 'timestamp', 'Deklaratsiya tizimda qabul qilingan vaqt.', true, 10),

    ('00000000-0000-0000-0000-000000240201', 'COMMODITY_CM', 'ID', 'Kommersiya tovar ID', 'varchar', '255', 'varchar(255)', 'Kommersiya tovar satrining identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000240202', 'COMMODITY_CM', 'COMMERCEDECL_ID', 'Kommersiya deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Tovar satri qaysi kommersiya deklaratsiyasiga tegishli ekanini ko''rsatadi.', true, 2),
    ('00000000-0000-0000-0000-000000240203', 'COMMODITY_CM', 'G33', 'TN VED kodi', 'varchar', '10', 'varchar(10)', 'Kommersiya jo''natmasidagi mahsulot kodi.', true, 3),
    ('00000000-0000-0000-0000-000000240204', 'COMMODITY_CM', 'G31NAME', 'Mahsulot nomi', 'varchar', '1500', 'varchar(1500)', 'Mahsulotning tavsiflangan nomi.', true, 4),
    ('00000000-0000-0000-0000-000000240205', 'COMMODITY_CM', 'G36', 'Netto og''irlik', 'decimal', '18,3', 'decimal(18,3)', 'Mahsulotning netto og''irligi.', false, 5),
    ('00000000-0000-0000-0000-000000240206', 'COMMODITY_CM', 'G42', 'Qiymat', 'decimal', '26,3', 'decimal(26,3)', 'Mahsulotning e''lon qilingan qiymati.', false, 6),
    ('00000000-0000-0000-0000-000000240207', 'COMMODITY_CM', 'IMEI1', 'Birinchi IMEI', 'varchar', '20', 'varchar(20)', 'Agar mahsulot telefon bo''lsa, birinchi IMEI raqami.', true, 7),
    ('00000000-0000-0000-0000-000000240208', 'COMMODITY_CM', 'COURSE_VALUE', 'Kurs qiymati', 'decimal', '13,3', 'decimal(13,3)', 'Valyuta kursi bo''yicha hisoblangan qiymat.', true, 8),
    ('00000000-0000-0000-0000-000000240209', 'COMMODITY_CM', 'POSITION', 'Satr tartibi', 'integer', null, 'integer', 'Deklaratsiyadagi mahsulotning pozitsiya tartib raqami.', true, 9),

    ('00000000-0000-0000-0000-000000240301', 'CDOCUMENTS_CM', 'ID', 'Kommersiya hujjat ID', 'varchar', '50', 'varchar(50)', 'Kommersiya hujjat yozuvining identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000240302', 'CDOCUMENTS_CM', 'COMMERCEDECL_ID', 'Kommersiya deklaratsiya ID', 'varchar', '50', 'varchar(50)', 'Hujjat qaysi kommersiya deklaratsiyasiga tegishli ekanini ko''rsatadi.', true, 2),
    ('00000000-0000-0000-0000-000000240303', 'CDOCUMENTS_CM', 'DOCCODE', 'Hujjat kodi', 'varchar', '20', 'varchar(20)', 'Kommersiya hujjati turi kodi.', true, 3),
    ('00000000-0000-0000-0000-000000240304', 'CDOCUMENTS_CM', 'DOCNO', 'Hujjat raqami', 'varchar', '150', 'varchar(150)', 'Taqdim etilgan hujjatning raqami.', true, 4),
    ('00000000-0000-0000-0000-000000240305', 'CDOCUMENTS_CM', 'DCODATE', 'Hujjat sanasi', 'date', null, 'date', 'Hujjat rasmiylashtirilgan sana.', true, 5),
    ('00000000-0000-0000-0000-000000240306', 'CDOCUMENTS_CM', 'REASON', 'Asos kodi', 'varchar', '150', 'varchar(150)', 'Hujjat talab etilishining asos kodi.', true, 6),
    ('00000000-0000-0000-0000-000000240307', 'CDOCUMENTS_CM', 'WEIGHT_DOC', 'Hujjatdagi og''irlik', 'decimal', '26,3', 'decimal(26,3)', 'Hujjatda ko''rsatilgan og''irlik.', true, 7),
    ('00000000-0000-0000-0000-000000240308', 'CDOCUMENTS_CM', 'WEIGHT_EC', 'EC og''irlik', 'decimal', '26,3', 'decimal(26,3)', 'Kommersiya deklaratsiyasida qayd etilgan og''irlik.', true, 8),

    ('00000000-0000-0000-0000-000000240401', 'CMREDIT', 'ID', 'Bog''lovchi karta ID', 'varchar', '50', 'varchar(50)', 'CMREDIT yozuvining identifikatori.', false, 1),
    ('00000000-0000-0000-0000-000000240402', 'CMREDIT', 'COMMODITY_ID', 'Tovar ID', 'varchar', '50', 'varchar(50)', 'Bog''lanayotgan tovar satrining identifikatori.', true, 2),
    ('00000000-0000-0000-0000-000000240403', 'CMREDIT', 'PARTINF_ID', 'Partiya ID', 'varchar', '50', 'varchar(50)', 'Jo''natma partiyasining identifikatori.', true, 3),
    ('00000000-0000-0000-0000-000000240404', 'CMREDIT', 'TRANSPORT_ID', 'Transport ID', 'varchar', '50', 'varchar(50)', 'Jo''natma bilan bog''liq transport yozuvi.', true, 4),
    ('00000000-0000-0000-0000-000000240405', 'CMREDIT', 'G21NO', 'Transport raqami', 'varchar', '150', 'varchar(150)', 'Jo''natmani olib kelgan transport vositasi raqami.', true, 5),
    ('00000000-0000-0000-0000-000000240406', 'CMREDIT', 'G35', 'Brutto og''irlik', 'varchar', '255', 'varchar(255)', 'Jo''natma bo''yicha qayd etilgan og''irlik qiymati.', true, 6),
    ('00000000-0000-0000-0000-000000240407', 'CMREDIT', 'G15', 'Jo''nash davlati', 'varchar', '3', 'varchar(3)', 'Jo''natma kelgan davlat kodi.', true, 7),
    ('00000000-0000-0000-0000-000000240408', 'CMREDIT', 'G17', 'Borish davlati', 'varchar', '255', 'varchar(255)', 'Jo''natma yetkaziladigan davlat kodi yoki belgilanishi.', true, 8),
    ('00000000-0000-0000-0000-000000240409', 'CMREDIT', 'RECEIVER_ID', 'Qabul qiluvchi ID', 'varchar', '50', 'varchar(50)', 'Qabul qiluvchi tomon identifikatori.', true, 9),
    ('00000000-0000-0000-0000-000000240410', 'CMREDIT', 'SHIPPER_ID', 'Jo''natuvchi ID', 'varchar', '50', 'varchar(50)', 'Jo''natuvchi tomon identifikatori.', true, 10);

update classifier_table_columns c
set column_name_definition = s.column_name_definition,
    column_type = s.column_type,
    column_length = s.column_length,
    data_type = s.data_type,
    column_description = s.column_description,
    nullable = s.nullable,
    ordinal_position = s.ordinal_position,
    updated_at = now()
from classifier_column_seed s
join classifier_tables t
    on lower(t.table_name) = lower(s.table_name)
where c.classifier_table_id = t.id
  and lower(c.column_name) = lower(s.column_name);

insert into classifier_table_columns (
    id,
    classifier_table_id,
    column_name,
    column_name_definition,
    column_type,
    column_length,
    data_type,
    column_description,
    nullable,
    ordinal_position
)
select
    s.column_id,
    t.id,
    s.column_name,
    s.column_name_definition,
    s.column_type,
    s.column_length,
    s.data_type,
    s.column_description,
    s.nullable,
    s.ordinal_position
from classifier_column_seed s
join classifier_tables t
    on lower(t.table_name) = lower(s.table_name)
where not exists (
    select 1
    from classifier_table_columns c
    where c.classifier_table_id = t.id
      and lower(c.column_name) = lower(s.column_name)
);
