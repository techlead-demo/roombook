INSERT INTO users (name, email, role) VALUES
    ('An Nguyen',  'an.nguyen@roombook.local',  'ADMIN'),
    ('Binh Tran',  'binh.tran@roombook.local',  'EMPLOYEE'),
    ('Chi Le',     'chi.le@roombook.local',     'EMPLOYEE'),
    ('Dung Pham',  'dung.pham@roombook.local',  'EMPLOYEE'),
    ('Hoa Vo',     'hoa.vo@roombook.local',     'EMPLOYEE'),
    ('Khanh Do',   'khanh.do@roombook.local',   'EMPLOYEE');

INSERT INTO rooms (name, capacity, active) VALUES
    ('Ha Long',  12, TRUE),
    ('Hoi An',    8, TRUE),
    ('Hue',       6, TRUE),
    ('Da Lat',    4, TRUE),
    ('Sa Pa',     2, TRUE),
    ('Phu Quoc', 20, TRUE);

INSERT INTO room_equipment (room_id, equipment)
SELECT r.id, e.equipment
FROM rooms r
JOIN (VALUES
    ('Ha Long',  'TV'), ('Ha Long',  'WHITEBOARD'), ('Ha Long',  'VIDEO_CONFERENCE'),
    ('Hoi An',   'TV'), ('Hoi An',   'VIDEO_CONFERENCE'),
    ('Hue',      'TV'), ('Hue',      'WHITEBOARD'),
    ('Da Lat',   'WHITEBOARD'),
    ('Phu Quoc', 'TV'), ('Phu Quoc', 'WHITEBOARD'), ('Phu Quoc', 'VIDEO_CONFERENCE')
) AS e (room_name, equipment) ON e.room_name = r.name;
