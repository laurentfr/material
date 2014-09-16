/**
 * @ngdoc module
 * @name material.components.sticky
 * @description
 *
 * Sticky effects for material
 */

angular.module('material.components.sticky', [])
.factory('$materialSticky', ['$window', '$document', '$$rAF', MaterialSticky])
.directive('materialSticky', ['$materialSticky', MaterialStickyDirective]);

/**
 * @ngdoc factory
 * @name $materialSticky
 * @module material.components.sticky
 *
 * @description
 * The `$materialSticky`service provides a mixin to make elements sticky.
 *
 * @returns A `$materialSticky` function that takes `$el` as an argument.
 */

function MaterialSticky($window, $document, $$rAF) {
  var browserStickySupport;

  /**
   * Registers an element as sticky, used internally by directives to register themselves
   */


  function registerStickyElement(scope, $el) {
    scope.$on('$destroy', function() { $deregister($el); });
    $el = Util.wrap($el, 'div', 'sticky-container'),
    $container = $el.controller('materialContent').$element;

    if(!$container) { throw new Error('$materialSticky used outside of material-contant'); }

    var $sticky = $container.data('$sticky') || {};
    var elements = $sticky.elements || [];
    elements.push($el);
    $sticky.elements = elements;

    // check sticky support on first register
    if(browserStickySupport === undefined) {
      browserStickySupport = checkStickySupport($el);
    } else if(browserStickySupport) {
      $el.css({position: browserStickySupport, top: '0px'});
    }

    var debouncedCheck = $sticky.check || $$rAF.debounce(angular.bind(undefined, checkElements, $container));
    $sticky.check = debouncedCheck;


    if(!browserStickySupport) {
      if(elements.length == 1) {
        $container.data('$sticky', $sticky);
        $container.on('scroll',  debouncedCheck);
      }
      scanElements($container);
    }

    return $deregister;

    // Deregister a sticky element, useful for $destroy event.
    function $deregister($el) {
      var innerElements = elements.map(function(el) { return el.children(0); });
      var index = innerElements.indexOf($el);
      if(index !== -1) {
        elements[index].replaceWith($el);
        elements.splice(index, 1);
        if(elements.length === 0) {
          $container.off('scroll', $sticky.check);
        }
      }
    }
  }
  return registerStickyElement;

  function checkStickySupport($el) {
    var stickyProps = ['sticky', '-webkit-sticky'];
    for(var i = 0; i < stickyProps.length; ++i) {
      $el.css({position: stickyProps[i], top: '0px'});
      if($window.getComputedStyle($el[0]).position == stickyProps[i]) {
        return stickyProps[i];
      }
    }
    $el.css({position: undefined, top: undefined});
    return false;
  }


  /* *
   * Function to prepare our lookups so we can go quick!
   * */

  function scanElements($container) {
    var $sticky = $container.data('$sticky');
    var elements = $sticky.elements;
    if(browserStickySupport) return; // don't need to do anything if we have native sticky
    targetElementIndex = 0;
    // Sort based on position in the window, and assign an active index
    orderedElements = elements.sort(function(a, b) {
      return rect(a).top - rect(b).top;
    });

    $sticky.orderedElements = orderedElements;


    // Iterate over our sorted elements and find the one that is active
    (function findTargetElement() {
      var scroll = $container.prop('scrollTop');
      for(var i = 0; i < orderedElements.length ; ++i) {
        if(rect(orderedElements[i]).bottom > 0) {
          targetElementIndex = i > 0 ? i - 1 : i;
        } else {
          targetElementIndex = i;
        }
      }
      $sticky.targetIndex = targetElementIndex;
    })();
  }

  function checkElements($container) {
    var next; // pointer to next target

    // Convenience getter for the target element
    var $sticky = $container.data('$sticky');

    var targetElementIndex = $sticky.targetIndex,
        orderedElements = $sticky.orderedElements;

    var content = targetElement().children(0);
    var contentRect = rect(content),
    targetRect = rect(targetElement());

    var scrollingDown = false,
        currentScroll = $container.prop('scrollTop'),
        lastScroll = $sticky.lastScroll;

    if(currentScroll > (lastScroll || 0)) {
      scrollingDown = true;
    }
    $sticky.lastScroll = currentScroll;

    var stickyActive = content.attr('material-sticky-active');


    // If we are scrollingDown, sticky, and are being pushed off screen by a different element, increment
    if(scrollingDown && stickyActive && contentRect.bottom <= 0 && targetElementIndex < orderedElements.length - 1) {
      targetElement().children(0).removeAttr('material-sticky-active');
      targetElement().css({height: null});
      incrementElement();
      return;

    //If we are going up, and our normal position would be rendered not sticky, un-sticky ourselves
    } else if(!scrollingDown && stickyActive && targetRect.top > 0) {
      targetElement().children(0).removeAttr('material-sticky-active');
      targetElement().css({height: null});
      incrementElement(-1);
      content.attr('material-sticky-active', true);
      content.css({transform: 'translate3d(0, ' + -1*contentRect.height + 'px, 0'});
      content.data('translatedHeight', -1*contentRect.height);
      targetElement().css({height: contentRect.height});
      return;

    // If we are going off screen and haven't been made sticky yet, go sticky
    } else if(scrollingDown && contentRect.top <= 0 && !stickyActive) {
      content.attr('material-sticky-active', true);
      targetElement().css({height: contentRect.height});
      contentRect = rect(content);
      next = targetElement(+1);
      var offset = 0;
      if(next) {
        nextRect = rect(next.children(0));
        if(rectsAreTouching(contentRect, nextRect)) {
          offset = nextRect.top - contentRect.bottom;
        }
      }
      offset = Math.min(offset, 0);
      content.css({transform: 'translate3d(0, ' + offset + 'px, 0'});
      content.data('translatedHeight', offset);
      return;
    } 

    var nextRect, offsetAmount, currentTop, translateAmt;

    // check if we need to push
    if(scrollingDown) {
      next = targetElement(+1);
      if(next) {
        nextRect = rect(next.children(0));
        if(rectsAreTouching(contentRect, nextRect)) {
          offsetAmount = contentRect.bottom - nextRect.top;
          currentTop = content.data('translatedHeight') || 0;
          translateAmt = currentTop - offsetAmount;
          content.css({transform: 'translate3d(0, ' + translateAmt + 'px, 0'});
          content.data('translatedHeight', translateAmt);
        }
      }
    // Check if we need to pull
    } else if(targetElementIndex < orderedElements.length - 1 && contentRect.top < 0) {
      nextRect = rect(targetElement(+1).children(0));
      offsetAmount = contentRect.bottom - nextRect.top;
      currentTop = content.data('translatedHeight') || 0;
      translateAmt = Math.min(currentTop - offsetAmount, 0);
      content.css({transform: 'translate3d(0, ' + translateAmt + 'px, 0'});
      content.data('translatedHeight', translateAmt);
    }

    function incrementElement(inc) {
      inc = inc || 1;
      targetElementIndex += inc;
      content = targetElement().children(0);
      contentRect = rect(content);
      $sticky.targetIndex = targetElementIndex;
    }

    function targetElement(indexModifier) {
      indexModifier = indexModifier || 0;
      if(targetElementIndex === undefined) return undefined;
      return orderedElements[targetElementIndex + indexModifier];
    }
  }

  function rectsAreTouching(first, second) {
    return first.bottom >= second.top;
  }

  // Helper functions to get position of element

  function rect($el) {
    return $el.hasOwnProperty(0) ? $el[0].getBoundingClientRect() : $el.getBoundingClientRect();
  }


}

/**
 * @ngdoc directive
 * @name materialSticky
 * @module material.components.sticky
 *
 * @description
 * Directive to consume the $materialSticky service
 *
 * @returns A material-sticky directive
 */
function MaterialStickyDirective($materialSticky) {
  return {
    restrict: 'A',
    link: $materialSticky
  };
}
