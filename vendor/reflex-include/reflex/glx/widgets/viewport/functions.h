#pragma once

#include "viewport.h"




//
//

namespace Reflex::GLX
{

	TRef <AbstractViewPort> GetContainingViewPort(Object & object);


	void SyncViewports(AbstractViewPort & from, AbstractViewPort & to, bool x, bool y);


	void Zoom(Zoomable & viewport, bool axis, Float time, Float vo, Float vr, Float pixel_padding = 0.0f);

	void Reveal(Zoomable & viewport, bool axis, Float vo, Float vr, Float pixel_padding);


	void RevealAll(Zoomable & viewport);

}




//
//impl

REFLEX_NS(Reflex::GLX::Detail)

void ClearZoomToggle(Zoomable & viewport, AbstractViewBar & viewbar);

void ToggleZoom(Zoomable & viewport, AbstractViewBar & viewbar, bool y);

REFLEX_END
