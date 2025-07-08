-- Insert some test clips around Berlin for development
-- Note: These are sample locations around Berlin's popular areas

-- Create a test profile (this would normally be created via auth)
INSERT INTO profiles (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Test User')
ON CONFLICT (id) DO NOTHING;

-- Sample clips around Berlin
INSERT INTO clips (id, owner, title, lat, lng, radius, url, like_count, dislike_count) VALUES
-- Alexanderplatz area
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Street Musician at Alex', 52.5219, 13.4132, 25, 'https://example.com/clip1.webm', 15, 2),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Tram Bell Symphony', 52.5215, 13.4125, 30, 'https://example.com/clip2.webm', 8, 1),

-- Brandenburg Gate area
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Tourist Chatter', 52.5163, 13.3777, 40, 'https://example.com/clip3.webm', 12, 3),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Horse Carriage Sounds', 52.5160, 13.3780, 35, 'https://example.com/clip4.webm', 20, 1),

-- Kreuzberg area
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Café Ambience', 52.4987, 13.4180, 20, 'https://example.com/clip5.webm', 25, 0),
('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Street Art Spray', 52.4990, 13.4175, 15, 'https://example.com/clip6.webm', 7, 4),

-- Prenzlauer Berg area
('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Children Playing', 52.5482, 13.4050, 30, 'https://example.com/clip7.webm', 18, 1),
('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Bike Bell Chorus', 52.5485, 13.4045, 25, 'https://example.com/clip8.webm', 11, 2),

-- Mitte area
('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Museum Island Footsteps', 52.5170, 13.4000, 35, 'https://example.com/clip9.webm', 14, 1),
('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'River Spree Waves', 52.5175, 13.4005, 40, 'https://example.com/clip10.webm', 22, 0)

ON CONFLICT (id) DO NOTHING;
