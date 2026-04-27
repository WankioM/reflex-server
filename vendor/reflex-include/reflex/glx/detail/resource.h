#pragma once

#include "../[require].h"




//
//

REFLEX_NS(Reflex::GLX::Detail)

struct PreCompiledResource : public Data::PropertySet
{
	PreCompiledResource(Key32 type) : type(type) {}

	Key32 type;
};

struct PreCompiledLayer : public PreCompiledResource
{
	REFLEX_OBJECT(PreCompiledLayer, PreCompiledResource);

	PreCompiledLayer(const Layer::Class & cls) : PreCompiledResource(K32("Layer")), cls(cls) {}

	#if (REFLEX_DEBUG)
	void OnSetProperty(Address adr, Object & object) override;
	#endif

	const Layer::Class & cls;
};

REFLEX_END

REFLEX_SET_TRAIT(Reflex::GLX::Detail::PreCompiledResource, IsSingleThreadExclusive);
REFLEX_SET_TRAIT(Reflex::GLX::Detail::PreCompiledLayer, IsSingleThreadExclusive);
