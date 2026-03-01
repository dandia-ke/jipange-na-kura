-- Jipange Na Kura — database setup
-- This file seeds the current_leaders table and ensures supporting tables exist.

-- Current leaders (governors, senators, women reps) 2022–2027
CREATE TABLE IF NOT EXISTS current_leaders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  party       text,
  seat_type   text NOT NULL,  -- 'governor' | 'senator' | 'womenrep'
  county      text NOT NULL,
  constituency text,
  photo_url   text,
  verified    boolean DEFAULT false,
  ballot_no   int,
  age         text,
  prev_seats  text,
  twitter     text,
  facebook    text,
  manifesto   text[]
);

-- Allow public read on current_leaders
ALTER TABLE current_leaders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read leaders" ON current_leaders FOR SELECT USING (true);

-- Polling stations table (already defined earlier for planner migration)
CREATE TABLE IF NOT EXISTS polling_stations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  county          text NOT NULL,
  constituency    text NOT NULL,
  ward            text NOT NULL,
  code            text,
  lat             numeric,
  lng             numeric
);

-- Election watch reports (used by the Watch page)
CREATE TABLE IF NOT EXISTS watch_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county       text,
  constituency text,
  ward         text,
  category     text,
  description  text NOT NULL,
  reporter     text,
  phone        text,
  lat          numeric,
  lng          numeric,
  created_at   timestamptz DEFAULT now()
);

-- Row Level Security: allow public SELECT and anon INSERT on watch_reports
ALTER TABLE watch_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reports" ON watch_reports FOR SELECT USING (true);
CREATE POLICY "Anon insert reports" ON watch_reports FOR INSERT WITH CHECK (true);

-- Candidate submissions (profile requests by potential candidates)
CREATE TABLE IF NOT EXISTS candidate_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  party text,
  seat_type text,
  county text NOT NULL,
  constituency text NOT NULL,
  manifesto text,
  contact text,
  created_at timestamptz DEFAULT now()
);

-- allow anonymous inserts (for form)
ALTER TABLE candidate_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert candidates" ON candidate_submissions FOR INSERT WITH CHECK (auth.role() = 'anon');


-- Jipange Na Kura — current_leaders seed
-- All 47 counties × 3 seat types (governor, senator, womenrep) = 141 rows
-- Run this in Supabase → SQL Editor after creating the table.

INSERT INTO current_leaders
  (name, party, seat_type, county, photo_url, verified, ballot_no, age, prev_seats, twitter, facebook, manifesto)
VALUES

-- ── COAST ──
('Abdullswamad Shariff Nassir','ODM','governor','Mombasa','photos/governors/mombasa.png',true,1,'—','Elected 2022','Abdulswamad_N','AbdullswamadNassir',ARRAY['Serving Mombasa County 2022–2027']),
('Mohamed Faki Mwinyihaji','ODM','senator','Mombasa','photos/senators/mombasa.png',true,1,'—','Elected 2022','MohamedFaki_',NULL,ARRAY['Senator for Mombasa County 2022–2027']),
('Zamzam Mohamed','ODM','womenrep','Mombasa','photos/women-reps/mombasa.png',true,1,'—','Elected 2022','ZamzamMohamed_',NULL,ARRAY['Women Representative for Mombasa County 2022–2027']),

('Fatuma Mohamed Achani','UDA','governor','Kwale','photos/governors/kwale.png',true,1,'—','Elected 2022','FatumaAchani','GovernorFatumaAchani',ARRAY['Serving Kwale County 2022–2027']),
('Issa Juma Boy','ODM','senator','Kwale','photos/senators/kwale.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Senator for Kwale County 2022–2027']),
('Fatuma Hamisi Masito','UDA','womenrep','Kwale','photos/women-reps/kwale.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Kwale County 2022–2027']),

('Gideon Maitha Mung''aro','ODM','governor','Kilifi','photos/governors/kilifi.png',true,1,'—','Elected 2022','GideonMungaro','GideonMungaro',ARRAY['Serving Kilifi County 2022–2027']),
('Stewart Madzayo','ODM','senator','Kilifi','photos/senators/kilifi.png',true,1,'—','Elected 2022','StewartMadzayo','StewartMadzayo',ARRAY['Senator for Kilifi County 2022–2027']),
('Gertrude Mbeyu','ODM','womenrep','Kilifi','photos/women-reps/kilifi.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Kilifi County 2022–2027']),

('Dhadho Gaddae Godhana','ODM','governor','Tana River','photos/governors/tana_river.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Serving Tana River County 2022–2027']),
('Danson Buya Mungatana','Jubilee','senator','Tana River','photos/senators/tana_river.png',true,1,'—','Elected 2022','DMungatana','DansonMungatana',ARRAY['Senator for Tana River County 2022–2027']),
('Amina Dika','ODM','womenrep','Tana River','photos/women-reps/tana_river.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Tana River County 2022–2027']),

('Issa Abdalla Timamy','ANC','governor','Lamu','photos/governors/lamu.png',true,1,'—','Elected 2022','TimamyIssa',NULL,ARRAY['Serving Lamu County 2022–2027']),
('Joseph Githuku','UDA','senator','Lamu','photos/senators/lamu.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Senator for Lamu County 2022–2027']),
('Muthoni Marubu','UDA','womenrep','Lamu','photos/women-reps/lamu.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Lamu County 2022–2027']),

('Andrew Mwadime','Independent','governor','Taita Taveta','photos/governors/taita_taveta.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Serving Taita Taveta County 2022–2027']),
('Johnes Mwaruma','ODM','senator','Taita Taveta','photos/senators/taita_taveta.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Senator for Taita Taveta County 2022–2027']),
('Lydia Haika Mizighi','ODM','womenrep','Taita Taveta','photos/women-reps/taita_taveta.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Taita Taveta County 2022–2027']),

-- ── NORTH EASTERN ──
('Nathif Adam Jama','ODM','governor','Garissa','photos/governors/garissa.png',true,1,'—','Elected 2022','NathifAdam',NULL,ARRAY['Serving Garissa County 2022–2027']),
('Abdulkadir Haji','UDA','senator','Garissa','photos/senators/garissa.png',true,1,'—','Elected 2022','AbdulkadirHaji',NULL,ARRAY['Senator for Garissa County 2022–2027']),
('Edo Udgoon Siyad','ODM','womenrep','Garissa','photos/women-reps/garissa.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Garissa County 2022–2027']),

('Ahmed Abdullahi','ODM','governor','Wajir','photos/governors/wajir.png',true,1,'—','Elected 2022','AhmedAbdullahi_',NULL,ARRAY['Serving Wajir County 2022–2027']),
('Abass Sheikh Mohamed','ODM','senator','Wajir','photos/senators/wajir.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Senator for Wajir County 2022–2027']),
('Fatuma Abdi Jehow','ODM','womenrep','Wajir','photos/women-reps/wajir.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Wajir County 2022–2027']),

('Mohamed Adan Khalif','UDM','governor','Mandera','photos/governors/mandera.png',true,1,'—','Elected 2022','KhalifMohamed',NULL,ARRAY['Serving Mandera County 2022–2027']),
('Ali Roba','ODM','senator','Mandera','photos/senators/mandera.png',true,1,'—','Elected 2022','AliRobaMp',NULL,ARRAY['Senator for Mandera County 2022–2027']),
('Umul Ker Kassim','ODM','womenrep','Mandera','photos/women-reps/mandera.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Mandera County 2022–2027']),

-- ── NORTH / RIFT ──
('Mohamud Mohamed Ali','UDM','governor','Marsabit','photos/governors/marsabit.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Serving Marsabit County 2022–2027']),
('Mohamed Chute','ODM','senator','Marsabit','photos/senators/marsabit.png',true,1,'—','Elected 2022','MohamedChute',NULL,ARRAY['Senator for Marsabit County 2022–2027']),
('Naomi Waqo','UDA','womenrep','Marsabit','photos/women-reps/marsabit.png',true,1,'—','Elected 2022','NaomiWaqo','NaomiWaqoMarsabit',ARRAY['Women Representative for Marsabit County 2022–2027']),

('Abdi Ibrahim Hassan','Jubilee','governor','Isiolo','photos/governors/isiolo.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Serving Isiolo County 2022–2027']),
('Fatuma Dullo','UDA','senator','Isiolo','photos/senators/isiolo.png',true,1,'—','Elected 2022','FatumaDullo','FatumaDullo',ARRAY['Senator for Isiolo County 2022–2027']),
('Mumina Bonaya','ODM','womenrep','Isiolo','photos/women-reps/isiolo.png',true,1,'—','Elected 2022','MuminaBonaya',NULL,ARRAY['Women Representative for Isiolo County 2022–2027']),

('Jeremiah Lomorukai','ODM','governor','Turkana','photos/governors/turkana.png',true,1,'—','Elected 2022','FennaEkwam',NULL,ARRAY['Serving Turkana County 2022–2027']),
('James Lomenen','ODM','senator','Turkana','photos/senators/turkana.png',true,1,'—','Elected 2022','JohnLodeedo',NULL,ARRAY['Senator for Turkana County 2022–2027']),
('Cecilia Ngitit','ODM','womenrep','Turkana','photos/women-reps/turkana.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Turkana County 2022–2027']),

('Simon Kachapin','UDA','governor','West Pokot','photos/governors/west_pokot.png',true,1,'—','Elected 2022','JohnLonyangapuo',NULL,ARRAY['Serving West Pokot County 2022–2027']),
('Julius Murgor','UDA','senator','West Pokot','photos/senators/west_pokot.png',true,1,'—','Elected 2022','KassinKamar',NULL,ARRAY['Senator for West Pokot County 2022–2027']),
('Rael Aleutum','UDA','womenrep','West Pokot','photos/women-reps/west_pokot.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for West Pokot County 2022–2027']),

('Jonathan Lelelit','UDA','governor','Samburu','photos/governors/samburu.png',true,1,'—','Elected 2022','LatiaBenson',NULL,ARRAY['Serving Samburu County 2022–2027']),
('Steve Lelegwe','UDA','senator','Samburu','photos/senators/samburu.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Senator for Samburu County 2022–2027']),
('Pauline Lenguris','UDA','womenrep','Samburu','photos/women-reps/samburu.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Samburu County 2022–2027']),

-- ── MOUNT KENYA ──
('Isaac Mutuma','Independent','governor','Meru','photos/governors/meru.png',true,1,'—','Elected 2022','IsaacMutuma_',NULL,ARRAY['Serving Meru County 2022–2027']),
('Kathuri Murungi','UDA','senator','Meru','photos/senators/meru.png',true,1,'—','Elected 2022','KathuriMurungi',NULL,ARRAY['Senator for Meru County 2022–2027']),
('Elizabeth Karambu','Independent','womenrep','Meru','photos/women-reps/meru.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Meru County 2022–2027']),

('Muthomi Njuki','UDA','governor','Tharaka-Nithi','photos/governors/tharaka_nithi.png',true,1,'—','Elected 2022','MuthomiNjuki','MuthomiNjuki',ARRAY['Serving Tharaka-Nithi County 2022–2027']),
('Julius Mwenda','UDA','senator','Tharaka-Nithi','photos/senators/tharaka_nithi.png',true,1,'—','Elected 2022','JuliusMwenda_',NULL,ARRAY['Senator for Tharaka-Nithi County 2022–2027']),
('Susan Ngugi','UDA','womenrep','Tharaka-Nithi','photos/women-reps/tharaka_nithi.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Tharaka-Nithi County 2022–2027']),

('Cecily Mbarire','UDA','governor','Embu','photos/governors/embu.png',true,1,'—','Elected 2022','CecilyMbarire','CecilyMbarire',ARRAY['Serving Embu County 2022–2027']),
('Alexander Mundigi','UDA','senator','Embu','photos/senators/embu.png',true,1,'—','Elected 2022','AlexMundigi',NULL,ARRAY['Senator for Embu County 2022–2027']),
('Jane Wanjiru','UDA','womenrep','Embu','photos/women-reps/embu.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Embu County 2022–2027']),

('Anne Waiguru','UDA','governor','Kirinyaga','photos/governors/kirinyaga.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Serving Kirinyaga County 2022–2027']),
('James Murango','UDA','senator','Kirinyaga','photos/senators/kirinyaga.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Senator for Kirinyaga County 2022–2027']),
('Jane Maina','UDA','womenrep','Kirinyaga','photos/women-reps/kirinyaga.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Kirinyaga County 2022–2027']),

('Mutahi Kahiga','UDA','governor','Nyeri','photos/governors/nyeri.png',true,1,'—','Elected 2022','MuriithiKahiga','MuriithiKahiga',ARRAY['Serving Nyeri County 2022–2027']),
('Wahome Wamatinga','UDA','senator','Nyeri','photos/senators/nyeri.png',true,1,'—','Elected 2022','BuruiKibiru',NULL,ARRAY['Senator for Nyeri County 2022–2027']),
('Rahab Mukami','UDA','womenrep','Nyeri','photos/women-reps/nyeri.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Nyeri County 2022–2027']),

-- ── CENTRAL ──
('Irungu Kang''ata','UDA','governor','Murang''a','photos/governors/muranga.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Serving Murang''a County 2022–2027']),
('Joe Nyutu','ODM','senator','Murang''a','photos/senators/muranga.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Senator for Murang''a County 2022–2027']),
('Betty Maina','ODM','womenrep','Murang''a','photos/women-reps/muranga.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Murang''a County 2022–2027']),

('Moses Kiarie Badilisha','UDA','governor','Nyandarua','photos/governors/nyandarua.png',true,1,'—','Elected 2022','MosesBadilisha',NULL,ARRAY['Serving Nyandarua County 2022–2027']),
('John Methu','UDA','senator','Nyandarua','photos/senators/nyandarua.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Senator for Nyandarua County 2022–2027']),
('Faith Gitau','UDA','womenrep','Nyandarua','photos/women-reps/nyandarua.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Nyandarua County 2022–2027']),

('Kimani Wamatangi','UDA','governor','Kiambu','photos/governors/kiambu.png',true,1,'—','Elected 2022','KimaniWamatangi','KimaniWamatangi',ARRAY['Serving Kiambu County 2022–2027']),
('Karungo Thangwa','UDA','senator','Kiambu','photos/senators/kiambu.png',true,1,'—','Elected 2022','KahiaThambu',NULL,ARRAY['Senator for Kiambu County 2022–2027']),
('Ann Wamuratha','UDA','womenrep','Kiambu','photos/women-reps/kiambu.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Kiambu County 2022–2027']),

-- ── EASTERN ──
('Julius Malombe','Wiper','governor','Kitui','photos/governors/kitui.png',true,1,'—','Elected 2022','JuliusMalombe',NULL,ARRAY['Serving Kitui County 2022–2027']),
('Enoch Wambua','Wiper','senator','Kitui','photos/senators/kitui.png',true,1,'—','Elected 2022','EnochWambua',NULL,ARRAY['Senator for Kitui County 2022–2027']),
('Irene Kasalu','Wiper','womenrep','Kitui','photos/women-reps/kitui.png',true,1,'—','Elected 2022','IreneKasalu',NULL,ARRAY['Women Representative for Kitui County 2022–2027']),

('Wavinya Ndeti','Wiper','governor','Machakos','photos/governors/machakos.png',true,1,'—','Elected 2022','WavinyaNdeti','WavinyaNdeti',ARRAY['Serving Machakos County 2022–2027']),
('Agnes Kavindu','Wiper','senator','Machakos','photos/senators/machakos.png',true,1,'—','Elected 2022','AgnesKavindu',NULL,ARRAY['Senator for Machakos County 2022–2027']),
('Joyce Kamene','Wiper','womenrep','Machakos','photos/women-reps/machakos.png',true,1,'—','Elected 2022','JoyceKamene','JoyceKamene',ARRAY['Women Representative for Machakos County 2022–2027']),

('Mutula Kilonzo Jr','Wiper','governor','Makueni','photos/governors/makueni.png',true,1,'—','Elected 2022','MutulaKilonzoJr','MutulaKilonzoJr',ARRAY['Serving Makueni County 2022–2027']),
('Daniel Maanzo','Wiper','senator','Makueni','photos/senators/makueni.png',true,1,'—','Elected 2022','DanielMaanzo',NULL,ARRAY['Senator for Makueni County 2022–2027']),
('Rose Museo','Wiper','womenrep','Makueni','photos/women-reps/makueni.png',true,1,'—','Elected 2022','RoseMuseo',NULL,ARRAY['Women Representative for Makueni County 2022–2027']),

-- ── RIFT VALLEY ──
('George Natembeya','DAP-K','governor','Trans Nzoia','photos/governors/trans_nzoia.png',true,1,'—','Elected 2022','GeorgeSobanja',NULL,ARRAY['Serving Trans Nzoia County 2022–2027']),
('Allan Chesang','UDA','senator','Trans Nzoia','photos/senators/trans_nzoia.png',true,1,'—','Elected 2022','AbrahamMutai',NULL,ARRAY['Senator for Trans Nzoia County 2022–2027']),
('Lilian Chebet','UDA','womenrep','Trans Nzoia','photos/women-reps/trans_nzoia.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Trans Nzoia County 2022–2027']),

('Jonathan Bii','UDA','governor','Uasin Gishu','photos/governors/uasin_gishu.png',true,1,'—','Elected 2022','JonathanBii',NULL,ARRAY['Serving Uasin Gishu County 2022–2027']),
('Jackson Mandago','UDA','senator','Uasin Gishu','photos/senators/uasin_gishu.png',true,1,'—','Elected 2022','JacksonMandago','JacksonMandago',ARRAY['Senator for Uasin Gishu County 2022–2027']),
('Gladys Boss','UDA','womenrep','Uasin Gishu','photos/women-reps/uasin_gishu.png',true,1,'—','Elected 2022','FatumaMohamed_',NULL,ARRAY['Women Representative for Uasin Gishu County 2022–2027']),

('Wisley Rotich','UDA','governor','Elgeyo-Marakwet','photos/governors/elgeyo_marakwet.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Serving Elgeyo-Marakwet County 2022–2027']),
('William Kisang','UDA','senator','Elgeyo-Marakwet','photos/senators/elgeyo_marakwet.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Senator for Elgeyo-Marakwet County 2022–2027']),
('Caroline Ng''elechei','UDA','womenrep','Elgeyo-Marakwet','photos/women-reps/elgeyo_marakwet.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Elgeyo-Marakwet County 2022–2027']),

('Stephen Sang','UDA','governor','Nandi','photos/governors/nandi.png',true,1,'—','Elected 2022','StephenSang',NULL,ARRAY['Serving Nandi County 2022–2027']),
('Samson Cherarkey','UDA','senator','Nandi','photos/senators/nandi.png',true,1,'—','Elected 2022','SamsonCherargei','SamsonCherargei',ARRAY['Senator for Nandi County 2022–2027']),
('Cynthia Muge','UDA','womenrep','Nandi','photos/women-reps/nandi.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Nandi County 2022–2027']),

('Benjamin Cheboi','UDA','governor','Baringo','photos/governors/baringo.png',true,1,'—','Elected 2022','BenjiLimo',NULL,ARRAY['Serving Baringo County 2022–2027']),
('William Cheptumo','UDA','senator','Baringo','photos/senators/baringo.png',true,1,'—','Elected 2022','WilliamCheptumo','WilliamCheptumo',ARRAY['Senator for Baringo County 2022–2027']),
('Florence Jematia','UDA','womenrep','Baringo','photos/women-reps/baringo.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Baringo County 2022–2027']),

('Joshua Irungu','UDA','governor','Laikipia','photos/governors/laikipia.png',true,1,'—','Elected 2022','JosphatNjoroge_',NULL,ARRAY['Serving Laikipia County 2022–2027']),
('John Kinyua','UDA','senator','Laikipia','photos/senators/laikipia.png',true,1,'—','Elected 2022','JohnKinyua_',NULL,ARRAY['Senator for Laikipia County 2022–2027']),
('Jane Kagiri','UDA','womenrep','Laikipia','photos/women-reps/laikipia.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Laikipia County 2022–2027']),

('Susan Kihika','UDA','governor','Nakuru','photos/governors/nakuru.png',true,1,'—','Elected 2022','SusanKihika','SusanKihika',ARRAY['Serving Nakuru County 2022–2027']),
('Tabitha Karanja','UDA','senator','Nakuru','photos/senators/nakuru.png',true,1,'—','Elected 2022','SuhaAltenan',NULL,ARRAY['Senator for Nakuru County 2022–2027']),
('Liza Chelule','UDA','womenrep','Nakuru','photos/women-reps/nakuru.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Nakuru County 2022–2027']),

('Patrick Ole Ntutu','UDA','governor','Narok','photos/governors/narok.png',true,1,'—','Elected 2022','PatrickNtutu',NULL,ARRAY['Serving Narok County 2022–2027']),
('Ledama Ole Kina','ODM','senator','Narok','photos/senators/narok.png',true,1,'—','Elected 2022','OlekinaLedama','LedamaOlekina',ARRAY['Senator for Narok County 2022–2027']),
('Rebecca Tonkei','UDA','womenrep','Narok','photos/women-reps/narok.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Narok County 2022–2027']),

('Joseph Ole Lenku','ODM','governor','Kajiado','photos/governors/kajiado.png',true,1,'—','Elected 2022','JosephLenku',NULL,ARRAY['Serving Kajiado County 2022–2027']),
('Seki Kanar','ODM','senator','Kajiado','photos/senators/kajiado.png',true,1,'—','Elected 2022','SamNyamweya',NULL,ARRAY['Senator for Kajiado County 2022–2027']),
('Leah Sankaire','ODM','womenrep','Kajiado','photos/women-reps/kajiado.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Kajiado County 2022–2027']),

('Eric Mutai','UDA','governor','Kericho','photos/governors/kericho.png',true,1,'—','Elected 2022','EricMutai_',NULL,ARRAY['Serving Kericho County 2022–2027']),
('Aaron Cheruiyot','UDA','senator','Kericho','photos/senators/kericho.png',true,1,'—','Elected 2022','aaronCheruiyot','AaronCheruiyot',ARRAY['Senator for Kericho County 2022–2027']),
('Beatrice Kemei','UDA','womenrep','Kericho','photos/women-reps/kericho.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Kericho County 2022–2027']),

('Hillary Barchok','UDA','governor','Bomet','photos/governors/bomet.png',true,1,'—','Elected 2022','HilaryBarchilei',NULL,ARRAY['Serving Bomet County 2022–2027']),
('Hillary Sigei','UDA','senator','Bomet','photos/senators/bomet.png',true,1,'—','Elected 2022','RoseSguda',NULL,ARRAY['Senator for Bomet County 2022–2027']),
('Linet Chepkorir','UDA','womenrep','Bomet','photos/women-reps/bomet.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Bomet County 2022–2027']),

-- ── WESTERN ──
('Fernandes Barasa','ODM','governor','Kakamega','photos/governors/kakamega.png',true,1,'—','Elected 2022','FernandoBarasa','GovernorFernandoBarasa',ARRAY['Serving Kakamega County 2022–2027']),
('Boni Khalwale','UDA','senator','Kakamega','photos/senators/kakamega.png',true,1,'—','Elected 2022','BonifaceKabaka',NULL,ARRAY['Senator for Kakamega County 2022–2027']),
('Elsie Muhanda','ODM','womenrep','Kakamega','photos/women-reps/kakamega.png',true,1,'—','Elected 2022','AyubSavula',NULL,ARRAY['Women Representative for Kakamega County 2022–2027']),

('Wilber Ottichilo','ODM','governor','Vihiga','photos/governors/vihiga.png',true,1,'—','Elected 2022','CaptOsullaOsuluu',NULL,ARRAY['Serving Vihiga County 2022–2027']),
('Godfrey Osotsi','ODM','senator','Vihiga','photos/senators/vihiga.png',true,1,'—','Elected 2022','MosesSitati',NULL,ARRAY['Senator for Vihiga County 2022–2027']),
('Beatrice Adagala','ODM','womenrep','Vihiga','photos/women-reps/vihiga.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Vihiga County 2022–2027']),

('Kenneth Lusaka','FORD Kenya','governor','Bungoma','photos/governors/bungoma.png',true,1,'—','Elected 2022','KennethlusaKa',NULL,ARRAY['Serving Bungoma County 2022–2027']),
('David Wakoli','UDA','senator','Bungoma','photos/senators/bungoma.png',true,1,'—','Elected 2022','WycliffOsuru',NULL,ARRAY['Senator for Bungoma County 2022–2027']),
('Catherine Nanjala','UDA','womenrep','Bungoma','photos/women-reps/bungoma.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Bungoma County 2022–2027']),

('Paul Otuoma','ODM','governor','Busia','photos/governors/busia.png',true,1,'—','Elected 2022','PaulOtuoma','PaulOtuoma',ARRAY['Serving Busia County 2022–2027']),
('Okiya Omtatah','ODM','senator','Busia','photos/senators/busia.png',true,1,'—','Elected 2022','OkiyaOmtata','OkiyaOmtatah',ARRAY['Senator for Busia County 2022–2027']),
('Catherine Omanyo','ODM','womenrep','Busia','photos/women-reps/busia.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Busia County 2022–2027']),

-- ── NYANZA ──
('James Orengo','ODM','governor','Siaya','photos/governors/siaya.png',true,1,'—','Elected 2022','JamesMigoori',NULL,ARRAY['Serving Siaya County 2022–2027']),
('Oburu Oginga','ODM','senator','Siaya','photos/senators/siaya.png',true,1,'—','Elected 2022','OburuOginga',NULL,ARRAY['Senator for Siaya County 2022–2027']),
('Christine Ombaka','ODM','womenrep','Siaya','photos/women-reps/siaya.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Siaya County 2022–2027']),

('Anyang'' Nyong''o','ODM','governor','Kisumu','photos/governors/kisumu.png',true,1,'—','Elected 2022','anyangnyongo','AnyangNyongo',ARRAY['Serving Kisumu County 2022–2027']),
('Tom Ojienda','ODM','senator','Kisumu','photos/senators/kisumu.png',true,1,'—','Elected 2022','tomOjienda',NULL,ARRAY['Senator for Kisumu County 2022–2027']),
('Ruth Odinga','ODM','womenrep','Kisumu','photos/women-reps/kisumu.png',true,1,'—','Elected 2022','RuthOdinga','RuthOdingaKe',ARRAY['Women Representative for Kisumu County 2022–2027']),

('Gladys Wanga','ODM','governor','Homa Bay','photos/governors/homa_bay.png',true,1,'—','Elected 2022','GladysWanga','GladysWanga',ARRAY['Serving Homa Bay County 2022–2027']),
('Moses Kajwang','ODM','senator','Homa Bay','photos/senators/homa_bay.png',true,1,'—','Elected 2022','MosesKajwang',NULL,ARRAY['Senator for Homa Bay County 2022–2027']),
('Joyce Atieno','ODM','womenrep','Homa Bay','photos/women-reps/homa_bay.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Homa Bay County 2022–2027']),

('Ochilo Ayacko','ODM','governor','Migori','photos/governors/migori.png',true,1,'—','Elected 2022','OchiloAyacko',NULL,ARRAY['Serving Migori County 2022–2027']),
('Eddy Oketch','ODM','senator','Migori','photos/senators/migori.png',true,1,'—','Elected 2022','EddyOketch',NULL,ARRAY['Senator for Migori County 2022–2027']),
('Dennitah Ghati','ODM','womenrep','Migori','photos/women-reps/migori.png',true,1,'—','Elected 2022','DennitahGhati','DennitahGhati',ARRAY['Women Representative for Migori County 2022–2027']),

('Simba Arati','ODM','governor','Kisii','photos/governors/kisii.png',true,1,'—','Elected 2022','SimbaArati','SimbaArati',ARRAY['Serving Kisii County 2022–2027']),
('Richard Onyonka','ODM','senator','Kisii','photos/senators/kisii.png',true,1,'—','Elected 2022','RichardOnyonka',NULL,ARRAY['Senator for Kisii County 2022–2027']),
('Dorice Donya','ODM','womenrep','Kisii','photos/women-reps/kisii.png',true,1,'—','Elected 2022','DoriceDonya',NULL,ARRAY['Women Representative for Kisii County 2022–2027']),

('Amos Nyaribo','UPA','governor','Nyamira','photos/governors/nyamira.png',true,1,'—','Elected 2022','AmosNyaribo',NULL,ARRAY['Serving Nyamira County 2022–2027']),
('Okongo Mogeni','ODM','senator','Nyamira','photos/senators/nyamira.png',true,1,'—','Elected 2022','OkongoMogeni',NULL,ARRAY['Senator for Nyamira County 2022–2027']),
('Jerusha Momanyi','ODM','womenrep','Nyamira','photos/women-reps/nyamira.png',true,1,'—','Elected 2022',NULL,NULL,ARRAY['Women Representative for Nyamira County 2022–2027']),

-- ── NAIROBI ──
('Johnson Sakaja','UDA','governor','Nairobi','photos/governors/nairobi.png',true,1,'—','Elected 2022','SakajaJohnson','SakajaJohnson',ARRAY['Serving Nairobi County 2022–2027']),
('Edwin Sifuna','ODM','senator','Nairobi','photos/senators/nairobi.png',true,1,'—','Elected 2022','EdwinSifuna','EdwinSifuna',ARRAY['Senator for Nairobi County 2022–2027']),
('Esther Passaris','Jubilee','womenrep','Nairobi','photos/women-reps/nairobi.png',true,1,'—','Elected 2022','EstherPassaris','EstherPassaris',ARRAY['Women Representative for Nairobi County 2022–2027']);
