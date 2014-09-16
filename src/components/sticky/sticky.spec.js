describe('$materialStickySpec', function() {
  beforeEach(module('materia.components.sticky'));
  // Todo, how to test this stuff?
  it('adds material-sticky-active when an element would scroll off screen');
  it('pushes the active element when the next sticky element touches it');
  it('pulls the active element when the next sticky element losens');
  it('throws an error if uses outside of material-content');
});
