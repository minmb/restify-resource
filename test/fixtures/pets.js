
var pets = ['tobi', 'jane', 'loki'];

exports.index = function(req, res){
  res.send(pets);
};

exports.show = function(req, res){
  res.end(JSON.stringify(req.pet));
};

exports.destroy = function(req, res){
  res.send({ message: 'pet removed' });
};

exports.load = function(id, fn){
  fn(null, pets[id]);
};