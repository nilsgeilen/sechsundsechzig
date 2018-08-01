all: ../../dat/train.json ../../dat/test.json

../../dat/train.json: mk_testset.js
	node mk_testset.js 10000 > ../../dat/train.json

../../dat/test.json: mk_testset.js
	node mk_testset.js 1000 > ../../dat/test.json