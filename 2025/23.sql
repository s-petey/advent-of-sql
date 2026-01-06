DROP TABLE IF EXISTS mountain_network;


CREATE TABLE mountain_network (
    id INTEGER PRIMARY KEY,
    from_node TEXT,
    to_node TEXT,
    node_type TEXT,    -- 'Lift' or 'Trail'
    difficulty TEXT    -- Only applicable for trails: 'green', 'blue', 'black', 'double_black'
);

INSERT INTO mountain_network (id, from_node, to_node, node_type, difficulty) VALUES
(1, 'Outlaw Express', 'Stairway Lift', 'Lift', NULL),
(2, 'Outlaw Express', 'Top Gun Bowl', 'Trail', 'black'),
(3, 'Top Gun Bowl', 'Top Gun', 'Trail', 'black'),
(4, 'Top Gun', 'Montoya', 'Trail', 'blue'),
(5, 'Montoya', 'Center Aisle', 'Trail', 'green'),
(6, 'Center Aisle', 'Lower Stampede', 'Trail', 'green'),
(7, 'Stairway Lift', 'Red''s Lift', 'Lift', NULL),
(8, 'Stairway Lift', 'Broadway', 'Trail', 'green'),
(9, 'Red''s Lift', 'Bearclaw', 'Trail', 'blue'),
(10, 'Bearclaw', 'Last Chance', 'Trail', 'blue'),
(11, 'Last Chance', 'Diamondback', 'Trail', 'blue'),
(12, 'Diamondback', 'Broadway', 'Trail', 'green'),
(13, 'Red''s Lift', 'Bishop''s Bowl', 'Trail', 'black'),
(14, 'Red''s Lift', 'Amy''s Ridge', 'Trail', 'blue'),
(15, 'Amy''s Ridge', 'Grizzly Bowl', 'Trail', 'black'),
(16, 'Flathead Lift', 'Amy''s Ridge', 'Trail', 'blue'),
(17, 'Jake''s Lift', 'Wildwood Lift', 'Lift', NULL),
(18, 'Wildwood Lift', 'Sidewinder', 'Trail', 'green'),
(19, 'Wildwood Lift', 'Brightside', 'Trail', 'blue'),
(20, 'Brightside', 'Moonrise', 'Trail', 'green'),
(21, 'Moonrise', 'Draw', 'Trail', 'green'),
(22, 'Moonrise', 'Lone Pine', 'Trail', 'blue'),
(23, 'Draw', 'Maverick', 'Trail', 'blue'),
(24, 'Draw', 'Broadway', 'Trail', 'green'),
(25, 'Broadway', 'Outlaw Trail', 'Trail', 'green'),
(26, 'Outlaw Trail', 'Center Aisle', 'Trail', 'green'),
(27, 'Center Aisle', 'Bandit', 'Trail', 'green'),
(28, 'Jake''s Lift', 'Maverick', 'Trail', 'blue');
