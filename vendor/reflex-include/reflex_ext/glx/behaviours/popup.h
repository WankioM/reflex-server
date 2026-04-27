#pragma once

#include "../widgets/menu.h"




//
//Addon API

namespace Reflex::GLX
{

	class PopupBehaviour;

}




//
//PopupBehaviour

class Reflex::GLX::PopupBehaviour : public Object::Delegate
{
public:
	
	REFLEX_OBJECT(GLX::PopupBehaviour, Delegate);

	REFLEX_DECLARE_KEY32(Popup);

	struct Config
	{
		FunctionPointer <TRef<GLX::Object>()> create_content = &Detail::CreateMenuContent;
		Key32 forward_event = Menu::kMenuOpen;
		Key32 style_id = kmenu;
	};

	static TRef <PopupBehaviour> Create(GLX::Object & object, const Config & config);

	static TRef <PopupBehaviour> Create(GLX::Object & object) { return Create(object, {}); }	//XCODE WORKAROUND default arg


	virtual GLX::Object * Open() = 0;
};

REFLEX_SET_TRAIT(Reflex::GLX::PopupBehaviour, IsSingleThreadExclusive);
