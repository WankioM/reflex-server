#pragma once

#include "../behaviours/popup.h"
#include "menu.h"




//
//Addon API

namespace Reflex::GLX
{

	class Popup;

}




//
//Popup

class Reflex::GLX::Popup : public Object
{
public:

	REFLEX_OBJECT(GLX::Popup, Object);

	static constexpr Key32 kMenuOpen = Menu::kMenuOpen;	//forwarded from Menu



	//lifetime

	Popup(const PopupBehaviour::Config & config = {});



	//components

	const TRef <PopupBehaviour> behaviour;

};

REFLEX_SET_TRAIT(Reflex::GLX::Popup, IsSingleThreadExclusive);




//
//impl

inline Reflex::GLX::Popup::Popup(const PopupBehaviour::Config & config)
	: behaviour(PopupBehaviour::Create(*this, config))
{
}
