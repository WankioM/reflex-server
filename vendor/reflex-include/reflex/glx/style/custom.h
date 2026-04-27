#pragma once

#include "../object.h"




//
//Experimental API

namespace Reflex::GLX
{

	void SetGraphicLayerOnDraw(Object & object, Key32 id, const Function <TRef<System::Renderer::Graphic>(Size size)> & ondraw);

	void UnsetGraphicLayerOnDraw(Object & object, Key32 id);

}
