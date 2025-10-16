-- 003_seed.sql
INSERT INTO users(id,email,name) VALUES ('demo_user','demo@example.com','Demo User');

INSERT INTO designs(id,user_id,product_slug,recipe_json,preview_url)
VALUES ('des_demo','demo_user','classic-tee','{"layers":[]}', 'https://cdn.example/preview.png');

INSERT INTO orders(id,user_id,product_slug,options_json,design_id,status,amount_cents)
VALUES ('ord_demo','demo_user','classic-tee','{"color":"Black","size":"L"}','des_demo','paid',2999);